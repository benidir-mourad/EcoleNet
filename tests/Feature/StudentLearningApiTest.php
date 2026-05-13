<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\QcmOption;
use App\Models\QcmQuestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class StudentLearningApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_student_courses_only_include_visible_resources(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $visible = $this->resourceForCourse($course, ['title' => 'Visible', 'is_visible' => true]);
        $this->resourceForCourse($course, ['title' => 'Hidden', 'is_visible' => false, 'order' => 2]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/courses')
            ->assertOk()
            ->assertJsonPath('courses.0.resources.0.id', $visible->id)
            ->assertJsonCount(1, 'courses.0.resources');
    }

    public function test_marking_resource_as_viewed_updates_progress_summary(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course);
        $this->resourceForCourse($course, ['title' => 'Second support', 'order' => 2]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/view")
            ->assertOk();

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/progress')
            ->assertOk()
            ->assertJsonPath('summary.0.viewed', 1)
            ->assertJsonPath('summary.0.total', 2)
            ->assertJsonPath('summary.0.percent', 50);
    }

    public function test_student_can_submit_qcm_and_attempt_is_scored(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['file_type' => 'qcm']);
        $this->enroll($student, $course->section->schoolClass);

        $question = QcmQuestion::create([
            'resource_id' => $resource->id,
            'question' => 'PHP est-il exécuté côté serveur ?',
            'points' => 2,
            'order' => 1,
        ]);
        $correct = QcmOption::create(['question_id' => $question->id, 'label' => 'Oui', 'is_correct' => true, 'order' => 1]);
        QcmOption::create(['question_id' => $question->id, 'label' => 'Non', 'is_correct' => false, 'order' => 2]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/qcm/attempt", [
                'answers' => [$question->id => [$correct->id]],
            ])
            ->assertOk()
            ->assertJsonPath('score', 2)
            ->assertJsonPath('percentage', 100);

        $this->assertDatabaseHas('student_progress', [
            'student_id' => $student->id,
            'resource_id' => $resource->id,
            'is_completed' => true,
        ]);
    }

    public function test_student_can_submit_file_upload_exercise_as_text(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'file_type' => 'file_upload']);
        $exercise = Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Compte rendu',
            'type' => 'file_upload',
            'max_score' => 20,
            'auto_correct' => false,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/exercises/{$exercise->id}/submit", ['content' => 'Mon rendu'])
            ->assertCreated()
            ->assertJsonPath('submission.status', 'submitted');

        $this->assertDatabaseHas('exercise_submissions', [
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'content' => 'Mon rendu',
        ]);
    }
}
