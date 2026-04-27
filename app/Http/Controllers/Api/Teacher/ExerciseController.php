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
    public function getQcm(Resource $resource)
    {
        $questions = $resource->qcmQuestions()->with('options')->get();
        return response()->json(['questions' => $questions]);
    }

    public function saveQcm(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'questions'                   => 'required|array|min:1',
            'questions.*.question'        => 'required|string',
            'questions.*.points'          => 'integer|min:1',
            'questions.*.explanation'     => 'nullable|string',
            'questions.*.options'         => 'required|array|min:2',
            'questions.*.options.*.label' => 'required|string',
            'questions.*.options.*.is_correct' => 'required|boolean',
        ]);

        // Replace all questions
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

        // Ensure resource type is qcm
        $resource->update(['file_type' => 'qcm']);

        return response()->json([
            'questions' => $resource->qcmQuestions()->with('options')->get(),
        ]);
    }

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
