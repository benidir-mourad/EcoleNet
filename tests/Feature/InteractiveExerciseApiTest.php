<?php

namespace Tests\Feature;

use App\Models\Exercise;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class InteractiveExerciseApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_drag_drop_attempt_returns_score_and_results(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['file_type' => 'drag_drop']);
        Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Associer',
            'type' => 'drag_drop',
            'content' => ['pairs' => [
                ['left' => 'HTML', 'right' => 'Structure'],
                ['left' => 'CSS', 'right' => 'Style'],
            ]],
            'max_score' => 2,
            'auto_correct' => true,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/dragdrop/attempt", [
                'answers' => [
                    ['left' => 'HTML', 'right' => 'Structure'],
                    ['left' => 'CSS', 'right' => 'Style'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('score', 2)
            ->assertJsonPath('max_score', 2);
    }

    public function test_fill_blanks_attempt_is_case_insensitive_by_default(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['file_type' => 'fill_blanks']);
        Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Texte à trous',
            'type' => 'fill_blanks',
            'content' => ['template' => 'PHP signifie [[Hypertext Preprocessor]].', 'case_sensitive' => false],
            'max_score' => 1,
            'auto_correct' => true,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/fill-blanks/attempt", [
                'answers' => ['hypertext preprocessor'],
            ])
            ->assertOk()
            ->assertJsonPath('score', 1)
            ->assertJsonPath('results.0.is_correct', true);
    }

    public function test_ordering_attempt_scores_correct_positions(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['file_type' => 'ordering']);
        Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Ordonner',
            'type' => 'ordering',
            'content' => ['items' => ['Analyser', 'Coder', 'Tester']],
            'max_score' => 3,
            'auto_correct' => true,
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/resources/{$resource->id}/ordering/attempt", [
                'order' => [0, 1, 2],
            ])
            ->assertOk()
            ->assertJsonPath('score', 3)
            ->assertJsonPath('max_score', 3);
    }
}
