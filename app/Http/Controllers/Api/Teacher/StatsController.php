<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\ExerciseSubmission;
use App\Models\QcmAttempt;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\StudentProgress;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    use AuthorizesCourseAccess;

    public function overview(Request $request)
    {
        $teacherId = $request->user()->id;

        $totalClasses = SchoolClass::count();
        $totalStudents = Enrollment::where('status', 'approved')->distinct('student_id')->count();
        $pendingEnrollments = Enrollment::where('status', 'pending')->count();
        $totalCourses = Course::where('teacher_id', $teacherId)->count();
        $insights = $this->teacherInsights($teacherId);

        return response()->json([
            'total_classes'       => $totalClasses,
            'total_students'      => $totalStudents,
            'pending_enrollments' => $pendingEnrollments,
            'total_courses'       => $totalCourses,
            ...$insights,
        ]);
    }

    public function allCourses(Request $request)
    {
        $teacherId = $request->user()->id;

        $courses = Course::where('teacher_id', $teacherId)
            ->with('section.schoolClass')
            ->get()
            ->map(function ($course) {
                $qcmAttempts = QcmAttempt::whereHas('resource', fn($q) => $q->where('course_id', $course->id))->get();
                $avgQcm = $qcmAttempts->avg(fn($a) => $a->max_score > 0 ? ($a->score / $a->max_score) * 100 : 0);

                return [
                    'id'               => $course->id,
                    'name'             => $course->name,
                    'section'          => $course->section?->name,
                    'class'            => $course->section?->schoolClass?->name,
                    'qcm_attempts'     => $qcmAttempts->count(),
                    'avg_qcm_percent'  => round($avgQcm ?? 0, 1),
                ];
            });

        return response()->json(['courses' => $courses]);
    }

    public function course(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

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

    private function teacherInsights(int $teacherId): array
    {
        $courses = Course::where('teacher_id', $teacherId)
            ->with(['section.schoolClass', 'resources.exercise'])
            ->get();

        $classIds = $courses
            ->pluck('section.class_id')
            ->filter()
            ->unique()
            ->values();

        $studentIds = Enrollment::whereIn('class_id', $classIds)
            ->where('status', 'approved')
            ->pluck('student_id')
            ->unique()
            ->values();

        $resourceIds = $courses
            ->flatMap(fn ($course) => $course->resources)
            ->where('is_visible', true)
            ->pluck('id')
            ->values();

        $exerciseIds = $courses
            ->flatMap(fn ($course) => $course->resources)
            ->pluck('exercise.id')
            ->filter()
            ->values();

        $uncorrectedSubmissions = ExerciseSubmission::whereIn('exercise_id', $exerciseIds)
            ->where('status', 'submitted')
            ->count();

        $recentSubmissions = ExerciseSubmission::whereIn('exercise_id', $exerciseIds)
            ->with(['student', 'exercise.resource.course'])
            ->latest('submitted_at')
            ->limit(6)
            ->get()
            ->map(fn ($submission) => [
                'submission_id' => $submission->id,
                'student_name' => $submission->student?->full_name,
                'course_id' => $submission->exercise?->resource?->course_id,
                'course_name' => $submission->exercise?->resource?->course?->name,
                'exercise_title' => $submission->exercise?->title,
                'status' => $submission->status,
                'submitted_at' => $submission->submitted_at,
                'url' => "/teacher/resources/{$submission->exercise?->resource_id}/submissions",
            ])
            ->values();

        $courseHealth = $courses->map(function ($course) {
            $classId = $course->section?->class_id;
            $students = Enrollment::where('class_id', $classId)
                ->where('status', 'approved')
                ->pluck('student_id');
            $visibleResources = $course->resources->where('is_visible', true);
            $expectedViews = $students->count() * $visibleResources->count();
            $viewed = StudentProgress::where('course_id', $course->id)
                ->whereIn('student_id', $students)
                ->whereIn('resource_id', $visibleResources->pluck('id'))
                ->where('is_viewed', true)
                ->count();

            $exerciseIds = $course->resources->pluck('exercise.id')->filter();
            $pendingCorrections = ExerciseSubmission::whereIn('exercise_id', $exerciseIds)
                ->where('status', 'submitted')
                ->count();

            return [
                'course_id' => $course->id,
                'course_name' => $course->name,
                'class_name' => $course->section?->schoolClass?->name,
                'students' => $students->count(),
                'visible_resources' => $visibleResources->count(),
                'progress_percent' => $expectedViews > 0 ? round(($viewed / $expectedViews) * 100) : 0,
                'pending_corrections' => $pendingCorrections,
                'url' => "/teacher/courses/{$course->id}",
            ];
        })->values();

        return [
            'pedagogical_alerts' => [
                'at_risk_students' => $this->atRiskStudents($courses),
                'pending_corrections' => $uncorrectedSubmissions,
                'inactive_students' => $this->inactiveStudentsCount($studentIds, $resourceIds),
            ],
            'course_health' => $courseHealth,
            'recent_activity' => [
                'submissions' => $recentSubmissions,
            ],
        ];
    }

    private function atRiskStudents($courses)
    {
        return $courses
            ->flatMap(function ($course) {
                $classId = $course->section?->class_id;
                $students = Enrollment::where('class_id', $classId)
                    ->where('status', 'approved')
                    ->with('student')
                    ->get()
                    ->pluck('student')
                    ->filter();

                $visibleResourceIds = $course->resources->where('is_visible', true)->pluck('id');
                $exerciseIds = $course->resources->pluck('exercise.id')->filter();
                $pastDeadlineExerciseIds = $course->resources
                    ->pluck('exercise')
                    ->filter(fn ($exercise) => $exercise?->deadline && $exercise->deadline->isPast())
                    ->pluck('id');

                return $students->map(function ($student) use ($course, $visibleResourceIds, $exerciseIds, $pastDeadlineExerciseIds) {
                    $progress = StudentProgress::where('student_id', $student->id)
                        ->where('course_id', $course->id)
                        ->whereIn('resource_id', $visibleResourceIds)
                        ->get();

                    $viewed = $progress->where('is_viewed', true)->count();
                    $progressPercent = $visibleResourceIds->count() > 0 ? round(($viewed / $visibleResourceIds->count()) * 100) : 0;
                    $lastActivity = $progress->max('viewed_at');

                    $studentSubmissions = ExerciseSubmission::where('student_id', $student->id)
                        ->whereIn('exercise_id', $exerciseIds)
                        ->get();

                    $submittedExerciseIds = $studentSubmissions->pluck('exercise_id');
                    $overdue = $pastDeadlineExerciseIds->diff($submittedExerciseIds)->count();
                    $pendingCorrections = $studentSubmissions->where('status', 'submitted')->count();
                    $inactive = !$lastActivity || $lastActivity->lt(now()->subDays(7));
                    $riskScore = (100 - $progressPercent) + ($overdue * 30) + ($pendingCorrections * 20) + ($inactive ? 20 : 0);

                    if ($riskScore < 80 && $overdue === 0 && $pendingCorrections === 0) {
                        return null;
                    }

                    return [
                        'student_id' => $student->id,
                        'student_name' => $student->full_name,
                        'course_id' => $course->id,
                        'course_name' => $course->name,
                        'progress_percent' => $progressPercent,
                        'overdue_exercises' => $overdue,
                        'pending_corrections' => $pendingCorrections,
                        'last_activity_at' => $lastActivity,
                        'risk_score' => $riskScore,
                        'message_url' => "/teacher/messages",
                        'course_url' => "/teacher/courses/{$course->id}",
                    ];
                })->filter();
            })
            ->sortByDesc('risk_score')
            ->take(6)
            ->values();
    }

    private function inactiveStudentsCount($studentIds, $resourceIds): int
    {
        if ($studentIds->isEmpty()) {
            return 0;
        }

        $activeStudentIds = StudentProgress::whereIn('student_id', $studentIds)
            ->whereIn('resource_id', $resourceIds)
            ->where('viewed_at', '>=', now()->subDays(7))
            ->pluck('student_id')
            ->unique();

        return $studentIds->diff($activeStudentIds)->count();
    }
}
