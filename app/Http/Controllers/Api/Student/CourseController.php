<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function availableClasses()
    {
        $classes = SchoolClass::where('is_active', true)->get();
        return response()->json(['classes' => $classes]);
    }

    public function index(Request $request)
    {
        $student = $request->user();

        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'approved')
            ->first();

        if (!$enrollment) {
            return response()->json(['courses' => []]);
        }

        $courses = Course::whereHas('section', fn($q) => $q->where('class_id', $enrollment->class_id))
            ->where('is_active', true)
            ->with('section', 'resources')
            ->get()
            ->map(function ($course) {
                $course->resources = $course->resources->where('is_visible', true)->values();
                return $course;
            });

        return response()->json(['courses' => $courses]);
    }

    public function show(Request $request, Course $course)
    {
        $student = $request->user();

        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'approved')
            ->first();

        if (!$enrollment) {
            return response()->json(['message' => 'Not enrolled.'], 403);
        }

        $course->load(['resources' => fn($q) => $q->where('is_visible', true), 'section.schoolClass']);

        return response()->json(['course' => $course]);
    }

    public function resource(Request $request, \App\Models\Resource $resource)
    {
        $student = $request->user();

        if (!$resource->is_visible) {
            return response()->json(['message' => 'Resource not available.'], 403);
        }

        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'approved')
            ->first();

        if (!$enrollment) {
            return response()->json(['message' => 'Not enrolled.'], 403);
        }

        return response()->json(['resource' => $resource->load('qcmQuestions.options', 'exercise')]);
    }
}
