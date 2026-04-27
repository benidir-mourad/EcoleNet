<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\StudentProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SubmissionController extends Controller
{
    public function store(Request $request, Exercise $exercise)
    {
        $student = $request->user();

        $data = $request->validate([
            'file'    => 'nullable|file|max:20480',
            'content' => 'nullable|string',
        ]);

        if (!$request->hasFile('file') && empty($data['content'])) {
            return response()->json(['message' => 'Provide a file or content.'], 422);
        }

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('submissions/' . $student->id, 'public');
        }

        $submission = ExerciseSubmission::updateOrCreate(
            ['exercise_id' => $exercise->id, 'student_id' => $student->id],
            [
                'file_path'    => $filePath ?? null,
                'content'      => $data['content'] ?? null,
                'status'       => 'submitted',
                'submitted_at' => now(),
                'score'        => null,
                'corrected_at' => null,
            ]
        );

        // Mark resource viewed
        StudentProgress::updateOrCreate(
            ['student_id' => $student->id, 'resource_id' => $exercise->resource_id],
            [
                'course_id' => $exercise->resource->course_id,
                'is_viewed' => true,
                'viewed_at' => now(),
            ]
        );

        return response()->json(['submission' => $submission], 201);
    }

    public function mySubmission(Request $request, Exercise $exercise)
    {
        $submission = ExerciseSubmission::where('exercise_id', $exercise->id)
            ->where('student_id', $request->user()->id)
            ->first();

        return response()->json(['submission' => $submission]);
    }
}
