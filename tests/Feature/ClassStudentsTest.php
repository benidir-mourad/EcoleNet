<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\StudentProgress;
use App\Services\ActivityLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class ClassStudentsTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_the_roster_lists_approved_students_with_their_progress(): void
    {
        $teacher = $this->user('teacher');
        $class = $this->schoolClass(['teacher' => $teacher]);
        $section = $this->section($class);
        $course = $this->courseForTeacher($teacher, ['section' => $section]);

        $seen = $this->resourceForCourse($course, ['is_visible' => true]);
        $this->resourceForCourse($course, ['is_visible' => true]);

        $student = $this->user('student', 'active', ['first_name' => 'Léa', 'last_name' => 'Martin']);
        $this->enroll($student, $class);

        // Une inscription en attente ne doit pas apparaître dans la liste.
        $this->enroll($this->user('student', 'pending'), $class, 'pending');

        StudentProgress::create([
            'student_id' => $student->id, 'course_id' => $course->id,
            'resource_id' => $seen->id, 'is_viewed' => true, 'viewed_at' => now(),
        ]);

        $response = $this->actingAs($teacher, 'sanctum')
            ->getJson("/api/teacher/classes/{$class->id}/students")
            ->assertOk()
            ->assertJsonCount(1, 'students');

        $response->assertJsonPath('students.0.full_name', 'Léa Martin');
        $response->assertJsonPath('students.0.viewed_resources', 1);
        $response->assertJsonPath('students.0.total_resources', 2);
        $response->assertJsonPath('students.0.progress_percent', 50);
    }

    public function test_the_roster_is_refused_on_another_teachers_class(): void
    {
        $owner = $this->user('teacher');
        $intruder = $this->user('teacher');
        $class = $this->schoolClass(['teacher' => $owner]);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/teacher/classes/{$class->id}/students")
            ->assertForbidden();
    }

    /* ── Changement de classe ──────────────────────────────────────────── */

    public function test_a_teacher_moves_a_student_between_their_classes(): void
    {
        $teacher = $this->user('teacher');
        $from = $this->schoolClass(['teacher' => $teacher, 'name' => '3TTI']);
        $to = $this->schoolClass(['teacher' => $teacher, 'name' => '4TTI']);

        $student = $this->user('student');
        $enrollment = $this->enroll($student, $from);

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/enrollments/{$enrollment->id}/transfer", ['class_id' => $to->id])
            ->assertOk();

        $this->assertSame($to->id, $enrollment->fresh()->class_id);
        $this->assertSame('approved', $enrollment->fresh()->status, 'Le déplacement ne remet pas en attente.');

        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $student->id,
            'type' => 'enrollment_transferred',
        ]);

        $entry = ActivityLog::where('action', ActivityLogger::ENROLLMENT_TRANSFERRED)->first();
        $this->assertNotNull($entry);
        $this->assertSame('3TTI', $entry->context['from']);
        $this->assertSame('4TTI', $entry->context['to']);
    }

    public function test_a_student_cannot_be_moved_into_another_teachers_class(): void
    {
        $teacher = $this->user('teacher');
        $stranger = $this->user('teacher');

        $from = $this->schoolClass(['teacher' => $teacher]);
        $elsewhere = $this->schoolClass(['teacher' => $stranger]);
        $enrollment = $this->enroll($this->user('student'), $from);

        // Sinon l'élève sortirait du périmètre de l'enseignant qui le déplace.
        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/enrollments/{$enrollment->id}/transfer", ['class_id' => $elsewhere->id])
            ->assertForbidden();

        $this->assertSame($from->id, $enrollment->fresh()->class_id);
    }

    public function test_moving_a_student_where_they_already_are_is_refused(): void
    {
        $teacher = $this->user('teacher');
        $class = $this->schoolClass(['teacher' => $teacher]);
        $enrollment = $this->enroll($this->user('student'), $class);

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/enrollments/{$enrollment->id}/transfer", ['class_id' => $class->id])
            ->assertStatus(422);
    }
}
