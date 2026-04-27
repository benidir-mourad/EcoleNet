<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\ExerciseSubmission;
use App\Models\QcmAttempt;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function overview(Request $request)
    {
        $teacherId = $request->user()->id;

        $totalClasses = SchoolClass::count();
        $totalStudents = Enrollment::where('status', 'approved')->distinct('student_id')->count();
        $pendingEnrollments = Enrollment::where('status', 'pending')->count();
        $totalCourses = Course::where('teacher_id', $teacherId)->count();

        return response()->json([
            'total_classes'       => $totalClasses,
            'total_students'      => $totalStudents,
            'pending_enrollments' => $pendingEnrollments,
            'total_courses'       => $totalCourses,
        ]);
    }

    public function course(Course $course)
    {
        $submissions = ExerciseSubmission::whereHas('exercise.resource', fn($q) => $q->where('course_id', $course->id))
            ->get();

        $avgScore = $submissions->where('status', 'corrected')->avg('score');

        $qcmAttempts = QcmAttempt::whereHas('resource', fn($q) => $q->where('course_id', $course->id))->get();
        $avgQcm = $qcmAttempts->avg(fn($a) => $a->max_score > 0 ? ($a->score / $a->max_score) * 100 : 0);

        return response()->json([
            'course'              => $course->load('resources'),
            'total_submissions'   => $submissions->count(),
            'avg_score'           => round($avgScore ?? 0, 2),
            'total_qcm_attempts'  => $qcmAttempts->count(),
            'avg_qcm_percent'     => round($avgQcm ?? 0, 2),
        ]);
    }
}
