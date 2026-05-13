<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function pending()
    {
        $enrollments = Enrollment::with('student', 'schoolClass')
            ->where('status', 'pending')
            ->latest()
            ->get();

        return response()->json(['enrollments' => $enrollments]);
    }

    public function approve(Request $request, Enrollment $enrollment)
    {
        $enrollment->update([
            'status'      => 'approved',
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
        ]);

        // Activate the student account if pending
        if ($enrollment->student->status === 'pending') {
            $enrollment->student->update(['status' => 'active']);
        }

        app(NotificationService::class)->create(
            $enrollment->student,
            'enrollment_approved',
            'Inscription validée',
            "Ton inscription à {$enrollment->schoolClass->name} a été validée.",
            ['class_id' => $enrollment->class_id, 'url' => '/student/dashboard']
        );

        return response()->json(['enrollment' => $enrollment->fresh()->load('student', 'schoolClass')]);
    }

    public function reject(Request $request, Enrollment $enrollment)
    {
        $enrollment->update(['status' => 'rejected']);

        return response()->json(['enrollment' => $enrollment->fresh()->load('student', 'schoolClass')]);
    }

    public function classStudents(SchoolClass $class)
    {
        $students = $class->students()->where('enrollments.status', 'approved')->get();
        return response()->json(['students' => $students]);
    }
}
