<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class TeacherExerciseBuilderApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_teacher_can_save_qcm_builder_questions_and_options(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['file_type' => null]);

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/resources/{$resource->id}/qcm", [
                'questions' => [[
                    'question' => 'Que vaut 2 + 2 ?',
                    'points' => 3,
                    'options' => [
                        ['label' => '4', 'is_correct' => true],
                        ['label' => '5', 'is_correct' => false],
                    ],
                ]],
            ])
            ->assertOk()
            ->assertJsonCount(1, 'questions')
            ->assertJsonCount(2, 'questions.0.options');

        $this->assertDatabaseHas('resources', ['id' => $resource->id, 'file_type' => 'qcm']);
        $this->assertDatabaseHas('qcm_questions', ['resource_id' => $resource->id, 'points' => 3]);
    }

    public function test_teacher_can_create_code_editor_and_notify_students(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'is_visible' => true]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/resources/{$resource->id}/code-editor", [
                'title' => 'FizzBuzz',
                'instructions' => 'Écrire la fonction.',
                'language' => 'javascript',
                'starter_code' => 'function fizzBuzz() {}',
                'expected_output' => '1 2 Fizz',
                'max_score' => 10,
                'deadline' => now()->addWeek()->toISOString(),
            ])
            ->assertOk()
            ->assertJsonPath('exercise.type', 'code_editor')
            ->assertJsonPath('exercise.max_score', 10);

        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $student->id,
            'type' => 'new_assignment',
        ]);
    }

    public function test_teacher_can_create_auto_corrected_code_editor_tests(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'is_visible' => true]);

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/resources/{$resource->id}/code-editor", [
                'title' => 'Carte HTML CSS',
                'instructions' => 'Creer une carte.',
                'language' => 'html',
                'starter_code' => '<article class="card"></article>',
                'auto_correct' => true,
                'tests' => [
                    ['label' => 'Balise article', 'type' => 'html_tag', 'value' => 'article', 'points' => 2],
                    ['label' => 'Classe card', 'type' => 'contains', 'value' => 'class="card"', 'points' => 1],
                    ['label' => 'Pas de style inline', 'type' => 'not_contains', 'value' => 'style=', 'points' => 1],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('exercise.type', 'code_editor')
            ->assertJsonPath('exercise.auto_correct', true)
            ->assertJsonPath('exercise.max_score', 4)
            ->assertJsonCount(3, 'exercise.content.tests');
    }

    public function test_teacher_can_list_code_editor_presets_and_create_exercise_from_one(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'is_visible' => true]);

        $preset = $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/teacher/code-editor-presets')
            ->assertOk()
            ->assertJsonCount(5, 'presets')
            ->assertJsonPath('presets.0.id', 'html-profile-card')
            ->json('presets.0');

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/resources/{$resource->id}/code-editor", [
                'title' => $preset['title'],
                'instructions' => $preset['instructions'],
                'language' => $preset['language'],
                'starter_code' => $preset['starter_code'],
                'expected_output' => $preset['expected_output'],
                'auto_correct' => true,
                'tests' => $preset['tests'],
            ])
            ->assertOk()
            ->assertJsonPath('exercise.type', 'code_editor')
            ->assertJsonPath('exercise.auto_correct', true)
            ->assertJsonPath('exercise.content.language', 'html')
            ->assertJsonCount(5, 'exercise.content.tests');

        $this->assertDatabaseHas('exercises', [
            'resource_id' => $resource->id,
            'title' => 'Carte de profil HTML',
            'type' => 'code_editor',
            'max_score' => 7,
        ]);
    }

    public function test_teacher_can_create_code_editor_with_advanced_sql_tests(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'is_visible' => true]);

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/resources/{$resource->id}/code-editor", [
                'title' => 'Jointure SQL',
                'instructions' => 'Lister les etudiants inscrits dans une classe.',
                'language' => 'sql',
                'starter_code' => 'SELECT',
                'auto_correct' => true,
                'tests' => [
                    ['label' => 'Condition classe', 'type' => 'sql_where_condition', 'value' => 'class_id', 'property' => '=', 'expected' => '3', 'points' => 1],
                    ['label' => 'Tri nom', 'type' => 'sql_order_by', 'value' => 'name', 'expected' => 'ASC', 'points' => 1],
                    ['label' => 'Jointure inscriptions', 'type' => 'sql_join', 'value' => 'enrollments', 'expected' => 'students.id = enrollments.student_id', 'points' => 2],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('exercise.type', 'code_editor')
            ->assertJsonPath('exercise.auto_correct', true)
            ->assertJsonPath('exercise.max_score', 4)
            ->assertJsonPath('exercise.content.tests.0.type', 'sql_where_condition')
            ->assertJsonPath('exercise.content.tests.1.type', 'sql_order_by')
            ->assertJsonPath('exercise.content.tests.2.type', 'sql_join');
    }

    public function test_teacher_can_enable_file_submission_and_correct_submission_with_notification(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'is_visible' => true]);
        $this->enroll($student, $course->section->schoolClass);

        $exerciseId = $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/resources/{$resource->id}/file_exercise", [
                'instructions' => 'Déposer le fichier.',
                'max_score' => 20,
                'deadline' => now()->addDay()->toISOString(),
            ])
            ->assertOk()
            ->assertJsonPath('exercise.type', 'file_upload')
            ->json('exercise.id');

        $submission = ExerciseSubmission::create([
            'exercise_id' => $exerciseId,
            'student_id' => $student->id,
            'content' => 'Mon rendu',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/submissions/{$submission->id}/correct", [
                'score' => 18,
                'teacher_comment' => 'Très bien',
            ])
            ->assertOk()
            ->assertJsonPath('submission.score', 18);

        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $student->id,
            'type' => 'correction_published',
        ]);
    }

    public function test_teacher_can_save_truth_table_builder(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['file_type' => null]);

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/resources/{$resource->id}/truth-table", [
                'title' => 'Porte ET',
                'instructions' => 'Compléter la table.',
                'variables' => ['A', 'B'],
                'output_labels' => ['A ET B'],
                'rows' => [
                    ['inputs' => [0, 0], 'outputs' => [0]],
                    ['inputs' => [1, 1], 'outputs' => [1]],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('exercise.type', 'truth_table')
            ->assertJsonPath('exercise.max_score', 2);
    }
}
