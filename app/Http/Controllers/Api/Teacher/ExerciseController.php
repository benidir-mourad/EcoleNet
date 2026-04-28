<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\QcmOption;
use App\Models\QcmQuestion;
use App\Models\Resource;
use Illuminate\Http\Request;

class ExerciseController extends Controller
{
    // ── QCM ──────────────────────────────────────────────────────────────────

    public function getQcm(Resource $resource)
    {
        $questions = $resource->qcmQuestions()->with('options')->get();
        return response()->json(['questions' => $questions]);
    }

    public function saveQcm(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'questions'                        => 'required|array|min:1',
            'questions.*.question'             => 'required|string',
            'questions.*.points'               => 'integer|min:1',
            'questions.*.explanation'          => 'nullable|string',
            'questions.*.options'              => 'required|array|min:2',
            'questions.*.options.*.label'      => 'required|string',
            'questions.*.options.*.is_correct' => 'required|boolean',
        ]);

        $resource->qcmQuestions()->delete();

        foreach ($data['questions'] as $qIndex => $qData) {
            $question = QcmQuestion::create([
                'resource_id' => $resource->id,
                'question'    => $qData['question'],
                'order'       => $qIndex,
                'points'      => $qData['points'] ?? 1,
                'explanation' => $qData['explanation'] ?? null,
            ]);

            foreach ($qData['options'] as $oIndex => $oData) {
                QcmOption::create([
                    'question_id' => $question->id,
                    'label'       => $oData['label'],
                    'is_correct'  => $oData['is_correct'],
                    'order'       => $oIndex,
                ]);
            }
        }

        $resource->update(['file_type' => 'qcm']);

        return response()->json([
            'questions' => $resource->qcmQuestions()->with('options')->get(),
        ]);
    }

    // ── Drag & Drop ──────────────────────────────────────────────────────────

    public function getDragDrop(Resource $resource)
    {
        $exercise = $resource->exercise;
        return response()->json(['exercise' => $exercise]);
    }

    public function saveDragDrop(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'title'                => 'required|string|max:200',
            'instructions'         => 'nullable|string|max:1000',
            'pairs'                => 'required|array|min:2',
            'pairs.*.left'         => 'required|string|max:200',
            'pairs.*.right'        => 'required|string|max:200',
        ]);

        $exercise = Exercise::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'title'        => $data['title'],
                'instructions' => $data['instructions'] ?? null,
                'type'         => 'drag_drop',
                'content'      => ['pairs' => $data['pairs']],
                'max_score'    => count($data['pairs']),
                'auto_correct' => true,
            ]
        );

        $resource->update(['file_type' => 'drag_drop']);

        return response()->json(['exercise' => $exercise]);
    }

    public function attemptDragDrop(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'answers'        => 'required|array',
            'answers.*.left'  => 'required|string',
            'answers.*.right' => 'required|string',
        ]);

        $exercise = $resource->exercise;

        if (!$exercise || $exercise->type !== 'drag_drop') {
            return response()->json(['message' => 'Exercise not found.'], 404);
        }

        $pairs    = collect($exercise->content['pairs'] ?? []);
        $answers  = collect($data['answers']);
        $results  = [];
        $score    = 0;

        foreach ($pairs as $pair) {
            $given = $answers->firstWhere('left', $pair['left']);
            $correct = $given && $given['right'] === $pair['right'];
            if ($correct) $score++;
            $results[] = [
                'left'          => $pair['left'],
                'right_correct' => $pair['right'],
                'right_given'   => $given['right'] ?? null,
                'is_correct'    => $correct,
            ];
        }

        ExerciseSubmission::create([
            'exercise_id'  => $exercise->id,
            'student_id'   => $request->user()->id,
            'content'      => json_encode($data['answers']),
            'score'        => $score,
            'status'       => 'corrected',
            'submitted_at' => now(),
            'corrected_at' => now(),
        ]);

        return response()->json([
            'score'     => $score,
            'max_score' => $pairs->count(),
            'results'   => $results,
        ]);
    }

    // ── File submissions ─────────────────────────────────────────────────────

    public function submissions(Exercise $exercise)
    {
        $submissions = $exercise->submissions()->with('student')->latest()->get();
        return response()->json(['submissions' => $submissions]);
    }

    public function correct(Request $request, ExerciseSubmission $submission)
    {
        $data = $request->validate([
            'score'           => 'required|numeric|min:0',
            'teacher_comment' => 'nullable|string',
        ]);

        $submission->update([
            'score'           => $data['score'],
            'teacher_comment' => $data['teacher_comment'] ?? null,
            'status'          => 'corrected',
            'corrected_at'    => now(),
        ]);

        return response()->json(['submission' => $submission->fresh()->load('student')]);
    }
}
