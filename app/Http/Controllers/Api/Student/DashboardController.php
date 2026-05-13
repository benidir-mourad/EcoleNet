<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\SchoolClass;
use App\Models\StudentProgress;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $student = $request->user();

        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'approved')
            ->with('schoolClass.sections.courses.resources.exercise')
            ->first();

        $pendingEnrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'pending')
            ->with('schoolClass')
            ->first();

        $insights = $enrollment ? $this->buildInsights($student->id, $enrollment) : [
            'stats' => [
                'sections'           => 0,
                'courses'            => 0,
                'visible_resources'  => 0,
                'viewed_resources'   => 0,
                'pending_exercises'  => 0,
                'upcoming_deadlines' => 0,
            ],
            'upcoming_deadlines' => [],
            'recent_resources'   => [],
            'exercises_to_finish'=> [],
            'progress_by_course' => [],
        ];

        return response()->json([
            'enrollment'         => $enrollment,
            'pending_enrollment' => $pendingEnrollment,
            'student'            => $student,
            ...$insights,
        ]);
    }

    private function buildInsights(int $studentId, Enrollment $enrollment): array
    {
        $sections = $enrollment->schoolClass?->sections ?? collect();
        $courses = $sections->flatMap(fn($section) => $section->courses ?? collect());
        $resources = $courses
            ->flatMap(fn($course) => $course->resources ?? collect())
            ->filter(fn($resource) => $resource->is_visible)
            ->values();

        $resourceIds = $resources->pluck('id');
        $courseIds = $courses->pluck('id');

        $progress = StudentProgress::where('student_id', $studentId)
            ->whereIn('resource_id', $resourceIds)
            ->with('resource.course')
            ->get();

        $exercises = Exercise::whereIn('resource_id', $resourceIds)
            ->with('resource.course')
            ->get();

        $submissions = ExerciseSubmission::where('student_id', $studentId)
            ->whereIn('exercise_id', $exercises->pluck('id'))
            ->with('exercise.resource.course')
            ->latest('submitted_at')
            ->get()
            ->groupBy('exercise_id')
            ->map(fn($items) => $items->first());

        $progressByCourse = $courses->map(function ($course) use ($progress) {
            $visibleResources = ($course->resources ?? collect())->filter(fn($resource) => $resource->is_visible);
            $total = $visibleResources->count();
            $courseProgress = $progress->where('course_id', $course->id);
            $viewed = $courseProgress->where('is_viewed', true)->count();
            $completed = $courseProgress->where('is_completed', true)->count();

            return [
                'course_id'   => $course->id,
                'course_name' => $course->name,
                'total'       => $total,
                'viewed'      => $viewed,
                'completed'   => $completed,
                'percent'     => $total > 0 ? round(($viewed / $total) * 100) : 0,
            ];
        })->values();

        $upcomingDeadlines = $exercises
            ->filter(fn($exercise) => $exercise->deadline && $exercise->deadline->isFuture())
            ->sortBy(fn($exercise) => $exercise->deadline->timestamp)
            ->take(6)
            ->map(fn($exercise) => $this->formatExerciseCard($exercise, $submissions->get($exercise->id)))
            ->values();

        $allExercisesToFinish = $exercises
            ->filter(function ($exercise) use ($submissions) {
                $submission = $submissions->get($exercise->id);
                return !$submission || $submission->status !== 'corrected';
            });

        $exercisesToFinish = $allExercisesToFinish
            ->sortBy(fn($exercise) => $exercise->deadline?->timestamp ?? PHP_INT_MAX)
            ->take(6)
            ->map(fn($exercise) => $this->formatExerciseCard($exercise, $submissions->get($exercise->id)))
            ->values();

        $recentResources = $progress
            ->filter(fn($item) => $item->is_viewed && $item->viewed_at)
            ->sortByDesc(fn($item) => $item->viewed_at->timestamp)
            ->take(5)
            ->map(fn($item) => [
                'resource_id' => $item->resource_id,
                'course_id'   => $item->course_id,
                'title'       => $item->resource?->title,
                'course_name' => $item->course?->name,
                'viewed_at'   => $item->viewed_at,
                'url'         => "/student/courses/{$item->course_id}",
            ])
            ->values();

        return [
            'stats' => [
                'sections'           => $sections->count(),
                'courses'            => $courses->count(),
                'visible_resources'  => $resources->count(),
                'viewed_resources'   => $progress->where('is_viewed', true)->count(),
                'pending_exercises'  => $allExercisesToFinish->count(),
                'upcoming_deadlines' => $upcomingDeadlines->count(),
            ],
            'upcoming_deadlines'  => $upcomingDeadlines,
            'recent_resources'    => $recentResources,
            'exercises_to_finish' => $exercisesToFinish,
            'progress_by_course'  => $progressByCourse,
        ];
    }

    private function formatExerciseCard(Exercise $exercise, ?ExerciseSubmission $submission): array
    {
        return [
            'exercise_id'       => $exercise->id,
            'resource_id'       => $exercise->resource_id,
            'course_id'         => $exercise->resource?->course_id,
            'title'             => $exercise->title,
            'type'              => $exercise->type,
            'deadline'          => $exercise->deadline,
            'course_name'       => $exercise->resource?->course?->name,
            'resource_title'    => $exercise->resource?->title,
            'submission_status' => $submission?->status,
            'submitted_at'      => $submission?->submitted_at,
            'url'               => "/student/courses/{$exercise->resource?->course_id}",
        ];
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
