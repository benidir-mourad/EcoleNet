<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\Chapter;
use App\Models\QcmAttempt;
use App\Models\StudentProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class EnrollmentStatsApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_teacher_can_list_approve_reject_pending_enrollments_and_list_class_students(): void
    {
        $teacher = $this->user('teacher');
        $pendingStudent = $this->user('student', 'pending');
        $rejectedStudent = $this->user('student');
        $class = $this->schoolClass(['name' => '6TTI']);
        $pending = $this->enroll($pendingStudent, $class, 'pending');
        $rejected = $this->enroll($rejectedStudent, $class, 'pending');

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/teacher/enrollments/pending')
            ->assertOk()
            ->assertJsonCount(2, 'enrollments');

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/enrollments/{$pending->id}/approve")
            ->assertOk()
            ->assertJsonPath('enrollment.status', 'approved');

        $this->assertSame('active', $pendingStudent->fresh()->status);
        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $pendingStudent->id,
            'type' => 'enrollment_approved',
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/enrollments/{$rejected->id}/reject")
            ->assertOk()
            ->assertJsonPath('enrollment.status', 'rejected');

        $this->actingAs($teacher, 'sanctum')
            ->getJson("/api/teacher/classes/{$class->id}/students")
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.id', $pendingStudent->id);
    }

    public function test_teacher_stats_overview_courses_and_course_detail_are_calculated(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['file_type' => 'qcm']);
        $exerciseResource = $this->resourceForCourse($course, ['title' => 'Rendu', 'type' => 'exercise', 'file_type' => 'file_upload', 'order' => 2]);
        $exercise = Exercise::create([
            'resource_id' => $exerciseResource->id,
            'title' => 'Rendu',
            'type' => 'file_upload',
            'max_score' => 20,
            'auto_correct' => false,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        QcmAttempt::create([
            'student_id' => $student->id,
            'resource_id' => $resource->id,
            'answers' => [],
            'score' => 8,
            'max_score' => 10,
            'attempt_number' => 1,
            'completed_at' => now(),
        ]);

        ExerciseSubmission::create([
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'content' => 'Rendu',
            'score' => 16,
            'status' => 'corrected',
            'submitted_at' => now(),
            'corrected_at' => now(),
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/teacher/stats/overview')
            ->assertOk()
            ->assertJsonPath('total_students', 1)
            ->assertJsonPath('total_courses', 1)
            ->assertJsonPath('pedagogical_alerts.pending_corrections', 0)
            ->assertJsonPath('course_health.0.progress_percent', 0)
            ->assertJsonPath('recent_activity.submissions.0.exercise_title', 'Rendu');

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/teacher/stats/courses')
            ->assertOk()
            ->assertJsonPath('courses.0.qcm_attempts', 1)
            ->assertJsonPath('courses.0.avg_qcm_percent', 80);

        $this->actingAs($teacher, 'sanctum')
            ->getJson("/api/teacher/courses/{$course->id}/stats")
            ->assertOk()
            ->assertJsonPath('total_submissions', 1)
            ->assertJsonPath('avg_score', 16)
            ->assertJsonPath('avg_qcm_percent', 80);
    }

    public function test_teacher_overview_flags_students_at_risk_and_pending_corrections(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['title' => 'Chapitre reseaux']);
        $exerciseResource = $this->resourceForCourse($course, [
            'title' => 'Devoir reseaux',
            'type' => 'exercise',
            'file_type' => 'file_upload',
            'order' => 2,
        ]);
        $exercise = Exercise::create([
            'resource_id' => $exerciseResource->id,
            'title' => 'Devoir reseaux',
            'type' => 'file_upload',
            'deadline' => now()->subDay(),
            'max_score' => 20,
            'auto_correct' => false,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        StudentProgress::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'resource_id' => $resource->id,
            'is_viewed' => true,
            'viewed_at' => now()->subDays(10),
        ]);

        ExerciseSubmission::create([
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'content' => 'A corriger',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/teacher/stats/overview')
            ->assertOk()
            ->assertJsonPath('pedagogical_alerts.pending_corrections', 1)
            ->assertJsonPath('pedagogical_alerts.inactive_students', 1)
            ->assertJsonPath('pedagogical_alerts.at_risk_students.0.student_id', $student->id)
            ->assertJsonPath('pedagogical_alerts.at_risk_students.0.course_id', $course->id)
            ->assertJsonPath('course_health.0.pending_corrections', 1)
            ->assertJsonPath('recent_activity.submissions.0.status', 'submitted');
    }

    public function test_teacher_can_view_chapter_progress_by_student(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student', 'active', [
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
        ]);
        $inactiveStudent = $this->user('student', 'active', [
            'first_name' => 'Grace',
            'last_name' => 'Hopper',
        ]);
        $course = $this->courseForTeacher($teacher);
        $chapter = Chapter::create(['course_id' => $course->id, 'title' => 'HTML bases', 'order' => 1]);
        $lesson = $this->resourceForCourse($course, [
            'chapter_id' => $chapter->id,
            'title' => 'Cours HTML',
            'file_type' => 'web_lesson',
            'is_visible' => true,
        ]);
        $exerciseResource = $this->resourceForCourse($course, [
            'chapter_id' => $chapter->id,
            'title' => 'Balises HTML',
            'type' => 'exercise',
            'file_type' => 'code_editor',
            'is_visible' => true,
            'order' => 2,
        ]);
        $exercise = Exercise::create([
            'resource_id' => $exerciseResource->id,
            'title' => 'Balises HTML',
            'type' => 'code_editor',
            'max_score' => 20,
            'auto_correct' => true,
        ]);
        $this->enroll($student, $course->section->schoolClass);
        $this->enroll($inactiveStudent, $course->section->schoolClass);

        StudentProgress::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'resource_id' => $lesson->id,
            'is_viewed' => true,
            'is_completed' => true,
            'viewed_at' => now(),
            'completed_at' => now(),
        ]);
        ExerciseSubmission::create([
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'content' => '<h1>Titre</h1>',
            'score' => 16,
            'status' => 'corrected',
            'submitted_at' => now(),
            'corrected_at' => now(),
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->getJson("/api/teacher/courses/{$course->id}/chapter-progress")
            ->assertOk()
            ->assertJsonPath('course.student_count', 2)
            ->assertJsonPath('chapters.0.title', 'HTML bases')
            ->assertJsonPath('chapters.0.avg_percent', 50)
            ->assertJsonPath('chapters.0.completed_students', 1)
            ->assertJsonPath('chapters.0.students_to_follow', 1)
            ->assertJsonPath('chapters.0.students.0.student_name', 'Ada Lovelace')
            ->assertJsonPath('chapters.0.students.0.percent', 100)
            ->assertJsonPath('chapters.0.students.0.avg_score_percent', 80)
            ->assertJsonPath('chapters.0.students.1.student_name', 'Grace Hopper')
            ->assertJsonPath('chapters.0.students.1.needs_attention', true);
    }
}
