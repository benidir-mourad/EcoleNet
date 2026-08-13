<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\QcmAttempt;
use App\Models\Resource;
use App\Models\StudentProgress;
use Illuminate\Http\Request;

class QcmController extends Controller
{
    use AuthorizesCourseAccess;

    public function attempt(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

        $student = $request->user();

        $data = $request->validate([
            'answers' => 'required|array',
        ]);

        $questions = $resource->qcmQuestions()->with('options')->get();

        if ($questions->isEmpty()) {
            return response()->json(['message' => 'No questions found.'], 422);
        }

        $alreadyAttempted = QcmAttempt::where('student_id', $student->id)
            ->where('resource_id', $resource->id)
            ->count();

        // max_attempts nul = illimité, le bon défaut pour un exercice d'entraînement.
        if ($resource->max_attempts && $alreadyAttempted >= $resource->max_attempts) {
            return response()->json([
                'message' => "Nombre de tentatives atteint ({$resource->max_attempts}).",
            ], 422);
        }

        // Calculate score
        $score = 0;
        $maxScore = 0;

        foreach ($questions as $question) {
            $maxScore += $question->points;
            $selectedOptionIds = $data['answers'][$question->id] ?? [];

            if (!is_array($selectedOptionIds)) {
                $selectedOptionIds = [$selectedOptionIds];
            }

            $correctIds = $question->options->where('is_correct', true)->pluck('id')->toArray();
            sort($correctIds);
            sort($selectedOptionIds);

            if ($correctIds === array_map('intval', $selectedOptionIds)) {
                $score += $question->points;
            }
        }

        $attemptNumber = $alreadyAttempted + 1;

        $attempt = QcmAttempt::create([
            'student_id'     => $student->id,
            'resource_id'    => $resource->id,
            'answers'        => $data['answers'],
            'score'          => $score,
            'max_score'      => $maxScore,
            'attempt_number' => $attemptNumber,
            'completed_at'   => now(),
        ]);

        // Mark progress as completed
        StudentProgress::updateOrCreate(
            ['student_id' => $student->id, 'resource_id' => $resource->id],
            [
                'course_id'    => $resource->course_id,
                'is_viewed'    => true,
                'is_completed' => true,
                'viewed_at'    => now(),
                'completed_at' => now(),
            ]
        );

        return response()->json([
            'attempt'    => $attempt,
            'score'      => $score,
            'max_score'  => $maxScore,
            'percentage' => $maxScore > 0 ? round(($score / $maxScore) * 100, 1) : 0,
            'questions'  => $questions->map(fn($q) => [
                'id'          => $q->id,
                'question'    => $q->question,
                'explanation' => $q->explanation,
                'correct_ids' => $q->options->where('is_correct', true)->pluck('id'),
                'your_answer' => $data['answers'][$q->id] ?? null,
            ]),
        ]);
    }

    public function myAttempts(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

        $attempts = QcmAttempt::where('student_id', $request->user()->id)
            ->where('resource_id', $resource->id)
            ->orderBy('attempt_number')
            ->get();

        return response()->json(['attempts' => $attempts]);
    }

    public function getQcm(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

        $questions = $resource->qcmQuestions()->with('options')->get();
        return response()->json(['questions' => $questions]);
    }

    public function getDragDrop(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

        $exercise = $resource->exercise;
        if (!$exercise || $exercise->type !== 'drag_drop') {
            return response()->json(['exercise' => null]);
        }
        return response()->json(['exercise' => $exercise]);
    }
}
