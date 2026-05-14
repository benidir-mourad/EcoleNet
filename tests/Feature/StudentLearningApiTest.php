<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\Chapter;
use App\Models\QcmOption;
use App\Models\QcmQuestion;
use App\Models\StudentProgress;
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

    public function test_student_course_includes_guided_chapter_progress(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $chapter = Chapter::create(['course_id' => $course->id, 'title' => 'HTML bases', 'order' => 1]);
        $lesson = $this->resourceForCourse($course, [
            'chapter_id' => $chapter->id,
            'title' => 'Lire le cours',
            'file_type' => 'web_lesson',
            'is_visible' => true,
        ]);
        $exercise = $this->resourceForCourse($course, [
            'chapter_id' => $chapter->id,
            'title' => 'Coder une page',
            'type' => 'exercise',
            'file_type' => 'code_editor',
            'is_visible' => true,
            'order' => 2,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        StudentProgress::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'resource_id' => $lesson->id,
            'is_viewed' => true,
            'is_completed' => true,
            'viewed_at' => now(),
            'completed_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/courses/{$course->id}")
            ->assertOk()
            ->assertJsonPath('course.chapters.0.learning_summary.total', 2)
            ->assertJsonPath('course.chapters.0.learning_summary.completed', 1)
            ->assertJsonPath('course.chapters.0.learning_summary.percent', 50)
            ->assertJsonPath('course.chapters.0.resources.0.learning_status.state', 'completed')
            ->assertJsonPath('course.chapters.0.resources.1.learning_status.state', 'todo');
    }

    public function test_student_can_mark_lesson_resource_as_completed(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['file_type' => 'web_lesson']);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/view", ['is_completed' => true])
            ->assertOk();

        $this->assertDatabaseHas('student_progress', [
            'student_id' => $student->id,
            'resource_id' => $resource->id,
            'is_viewed' => true,
            'is_completed' => true,
        ]);
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

    public function test_student_code_editor_submission_can_be_auto_corrected(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'file_type' => 'code_editor']);
        $exercise = Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Fonctions JS',
            'type' => 'code_editor',
            'content' => [
                'language' => 'javascript',
                'starter_code' => '',
                'tests' => [
                    ['label' => 'Fonction addition', 'type' => 'js_function', 'value' => 'addition', 'points' => 2],
                    ['label' => 'Retourne une somme', 'type' => 'contains', 'value' => 'return a + b', 'points' => 3],
                    ['label' => 'Pas de alert', 'type' => 'not_contains', 'value' => 'alert(', 'points' => 1],
                ],
            ],
            'max_score' => 6,
            'auto_correct' => true,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/submit", [
                'content' => 'function addition(a, b) { return a + b; }',
            ])
            ->assertCreated()
            ->assertJsonPath('submission.status', 'corrected')
            ->assertJsonPath('submission.score', 6)
            ->assertJsonPath('evaluation.percentage', 100)
            ->assertJsonPath('evaluation.results.0.passed', true);

        $this->assertDatabaseHas('exercise_submissions', [
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'status' => 'corrected',
            'score' => 6,
        ]);
    }

    public function test_student_sql_code_editor_submission_uses_sql_specific_rules(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'file_type' => 'code_editor']);
        $exercise = Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Requete SQL',
            'type' => 'code_editor',
            'content' => [
                'language' => 'sql',
                'starter_code' => '',
                'tests' => [
                    ['label' => 'Clause SELECT', 'type' => 'sql_clause', 'value' => 'SELECT', 'points' => 1],
                    ['label' => 'Table students', 'type' => 'sql_table', 'value' => 'students', 'points' => 2],
                    ['label' => 'Colonne email', 'type' => 'sql_column', 'value' => 'email', 'points' => 1],
                    ['label' => 'Condition actif', 'type' => 'sql_where_condition', 'value' => 'is_active', 'property' => '=', 'expected' => '1', 'points' => 1],
                    ['label' => 'Tri par nom', 'type' => 'sql_order_by', 'value' => 'name', 'points' => 1],
                ],
            ],
            'max_score' => 6,
            'auto_correct' => true,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/submit", [
                'content' => "SELECT name, email\nFROM students\nWHERE is_active = 1\nORDER BY name;",
            ])
            ->assertCreated()
            ->assertJsonPath('submission.status', 'corrected')
            ->assertJsonPath('submission.score', 6)
            ->assertJsonPath('evaluation.percentage', 100)
            ->assertJsonPath('evaluation.results.1.passed', true);

        $this->assertDatabaseHas('exercise_submissions', [
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'status' => 'corrected',
            'score' => 6,
        ]);
    }

    public function test_student_sql_code_editor_submission_can_check_join_rule(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'file_type' => 'code_editor']);
        $exercise = Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Jointure SQL',
            'type' => 'code_editor',
            'content' => [
                'language' => 'sql',
                'starter_code' => '',
                'tests' => [
                    ['label' => 'Table principale', 'type' => 'sql_table', 'value' => 'students', 'points' => 1],
                    ['label' => 'Joint la table enrollments', 'type' => 'sql_join', 'value' => 'enrollments', 'expected' => 'students.id = enrollments.student_id', 'points' => 2],
                    ['label' => 'Filtre la classe', 'type' => 'sql_where_condition', 'value' => 'class_id', 'property' => '=', 'expected' => '3', 'points' => 1],
                ],
            ],
            'max_score' => 4,
            'auto_correct' => true,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/submit", [
                'content' => "SELECT students.name\nFROM students\nJOIN enrollments ON students.id = enrollments.student_id\nWHERE class_id = 3;",
            ])
            ->assertCreated()
            ->assertJsonPath('submission.status', 'corrected')
            ->assertJsonPath('submission.score', 4)
            ->assertJsonPath('evaluation.percentage', 100)
            ->assertJsonPath('evaluation.results.1.passed', true);

        $this->assertDatabaseHas('exercise_submissions', [
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'status' => 'corrected',
            'score' => 4,
        ]);
    }
}
