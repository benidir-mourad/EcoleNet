<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $student = $request->user();

        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'approved')
            ->with('schoolClass.sections.courses.resources')
            ->first();

        $pendingEnrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'pending')
            ->with('schoolClass')
            ->first();

        return response()->json([
            'enrollment'         => $enrollment,
            'pending_enrollment' => $pendingEnrollment,
            'student'            => $student,
        ]);
    }

    public function enroll(Request $request)
    {
        $student = $request->user();

        $data = $request->validate([
            'class_id' => 'required|exists:classes,id',
        ]);

        // Check if already enrolled or pending
        $existing = Enrollment::where('student_id', $student->id)
            ->whereIn('status', ['pending', 'approved'])
            ->first();

        if ($existing) {
            return response()->json(['message' => 'You already have an active or pending enrollment.'], 422);
        }

        $enrollment = Enrollment::create([
            'student_id' => $student->id,
            'class_id'   => $data['class_id'],
            'status'     => 'pending',
        ]);

        return response()->json([
            'enrollment' => $enrollment->load('schoolClass'),
            'message'    => 'Enrollment request submitted. Waiting for teacher approval.',
        ], 201);
    }
}
