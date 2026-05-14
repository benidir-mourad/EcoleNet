<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\ExerciseSubmission;
use App\Models\QcmAttempt;
use App\Models\SchoolClass;
use App\Models\StudentProgress;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    use AuthorizesCourseAccess;

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
                $course->setRelation('resources', $course->resources->where('is_visible', true)->values());
                return $course;
            });

        return response()->json(['courses' => $courses]);
    }

    public function show(Request $request, Course $course)
    {
        $student = $request->user();

        $this->ensureStudentCanAccessCourse($request, $course);

        $course->load([
            'chapters' => fn($q) => $q->orderBy('order')->orderBy('id'),
            'chapters.resources' => fn($q) => $q->where('is_visible', true)->with('exercise')->orderBy('order'),
            'section.schoolClass',
        ]);

        $this->attachGuidedProgress($course, $student->id);

        return response()->json(['course' => $course]);
    }

    public function resource(Request $request, \App\Models\Resource $resource)
    {
        $student = $request->user();

        $this->ensureStudentCanAccessResource($request, $resource);

        return response()->json(['resource' => $resource->load('qcmQuestions.options', 'exercise')]);
    }

    private function attachGuidedProgress(Course $course, int $studentId): void
    {
        $resources = $course->chapters->flatMap(fn ($chapter) => $chapter->resources);
        $progressByResource = StudentProgress::where('student_id', $studentId)
            ->where('course_id', $course->id)
            ->get()
            ->keyBy('resource_id');
        $exerciseIds = $resources
            ->pluck('exercise.id')
            ->filter()
            ->values();
        $submissionsByExercise = ExerciseSubmission::where('student_id', $studentId)
            ->whereIn('exercise_id', $exerciseIds)
            ->latest('submitted_at')
            ->get()
            ->unique('exercise_id')
            ->keyBy('exercise_id');
        $qcmAttemptsByResource = QcmAttempt::where('student_id', $studentId)
            ->whereIn('resource_id', $resources->pluck('id'))
            ->latest('completed_at')
            ->get()
            ->unique('resource_id')
            ->keyBy('resource_id');

        $course->chapters->each(function ($chapter) use ($progressByResource, $submissionsByExercise, $qcmAttemptsByResource) {
            $completed = 0;

            $chapter->resources->each(function ($resource) use ($progressByResource, $submissionsByExercise, $qcmAttemptsByResource, &$completed) {
                $progress = $progressByResource->get($resource->id);
                $submission = $resource->exercise ? $submissionsByExercise->get($resource->exercise->id) : null;
                $qcmAttempt = $qcmAttemptsByResource->get($resource->id);
                $isCompleted = (bool) ($progress?->is_completed || $submission || $qcmAttempt);
                $isViewed = (bool) ($progress?->is_viewed || $isCompleted);
                $score = $qcmAttempt
                    ? $qcmAttempt->score . '/' . $qcmAttempt->max_score
                    : ($submission && $submission->score !== null ? $submission->score . '/' . $resource->exercise->max_score : null);

                if ($isCompleted) {
                    $completed++;
                }

                $resource->setAttribute('learning_status', [
                    'state' => $isCompleted ? 'completed' : ($isViewed ? 'in_progress' : 'todo'),
                    'is_viewed' => $isViewed,
                    'is_completed' => $isCompleted,
                    'score' => $score,
                    'submitted_at' => $submission?->submitted_at,
                    'completed_at' => $progress?->completed_at ?? $qcmAttempt?->completed_at,
                ]);
            });

            $total = $chapter->resources->count();
            $chapter->setAttribute('learning_summary', [
                'total' => $total,
                'completed' => $completed,
                'percent' => $total > 0 ? round(($completed / $total) * 100) : 0,
                'state' => $total > 0 && $completed === $total ? 'completed' : ($completed > 0 ? 'in_progress' : 'todo'),
            ]);
        });
    }
}
