<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Resource;
use App\Models\StudentProgress;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function markViewed(Request $request, Resource $resource)
    {
        $student = $request->user();

        StudentProgress::updateOrCreate(
            ['student_id' => $student->id, 'resource_id' => $resource->id],
            [
                'course_id' => $resource->course_id,
                'is_viewed' => true,
                'viewed_at' => now(),
            ]
        );

        return response()->json(['message' => 'Marked as viewed.']);
    }

    public function index(Request $request)
    {
        $student = $request->user();

        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'approved')
            ->first();

        if (!$enrollment) {
            return response()->json(['progress' => []]);
        }

        $progress = StudentProgress::where('student_id', $student->id)
            ->with('resource', 'course')
            ->get();

        $courses = Course::whereHas('section', fn($q) => $q->where('class_id', $enrollment->class_id))
            ->withCount(['resources' => fn($q) => $q->where('is_visible', true)])
            ->get();

        $summary = $courses->map(function ($course) use ($progress) {
            $viewed = $progress->where('course_id', $course->id)->where('is_viewed', true)->count();
            $completed = $progress->where('course_id', $course->id)->where('is_completed', true)->count();
            $total = $course->resources_count;

            return [
                'course_id'   => $course->id,
                'course_name' => $course->name,
                'total'       => $total,
                'viewed'      => $viewed,
                'completed'   => $completed,
                'percent'     => $total > 0 ? round(($viewed / $total) * 100) : 0,
            ];
        });

        return response()->json(['summary' => $summary]);
    }

    public function course(Request $request, Course $course)
    {
        $student = $request->user();

        $progress = StudentProgress::where('student_id', $student->id)
            ->where('course_id', $course->id)
            ->get()
            ->keyBy('resource_id');

        return response()->json(['progress' => $progress]);
    }
}
