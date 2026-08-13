<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Chapter;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exercise;
use App\Models\ForumPost;
use App\Models\Resource;
use App\Models\SchoolClass;
use App\Models\Section;
use Illuminate\Http\Request;

trait AuthorizesCourseAccess
{
    protected function ensureTeacherOwnsCourse(Request $request, Course $course): void
    {
        if ($request->user()->role === 'admin') {
            return;
        }

        abort_if($course->teacher_id !== $request->user()->id, 403, 'Forbidden.');
    }

    protected function ensureTeacherOwnsClass(Request $request, SchoolClass $class): void
    {
        if ($request->user()->role === 'admin') {
            return;
        }

        abort_if($class->teacher_id !== $request->user()->id, 403, 'Forbidden.');
    }

    /**
     * La propriété se lit sur la classe, pas sur le contenu de la section : une
     * section vide était auparavant réputée accessible à tous, ce qui ouvrait une
     * fenêtre au moment précis de sa création.
     */
    protected function ensureTeacherOwnsSection(Request $request, Section $section): void
    {
        $section->loadMissing('schoolClass');

        abort_if(!$section->schoolClass, 403, 'Forbidden.');

        $this->ensureTeacherOwnsClass($request, $section->schoolClass);
    }

    protected function ensureTeacherOwnsChapter(Request $request, Chapter $chapter): void
    {
        $chapter->loadMissing('course');
        $this->ensureTeacherOwnsCourse($request, $chapter->course);
    }

    protected function ensureTeacherOwnsResource(Request $request, Resource $resource): void
    {
        $resource->loadMissing('course');
        $this->ensureTeacherOwnsCourse($request, $resource->course);
    }

    protected function ensureTeacherOwnsExercise(Request $request, Exercise $exercise): void
    {
        $exercise->loadMissing('resource.course');
        $this->ensureTeacherOwnsResource($request, $exercise->resource);
    }

    protected function ensureTeacherOwnsPost(Request $request, ForumPost $post): void
    {
        $post->loadMissing('course');
        $this->ensureTeacherOwnsCourse($request, $post->course);
    }

    protected function ensureStudentCanAccessCourse(Request $request, Course $course): void
    {
        $course->loadMissing('section');

        abort_if(
            !$course->section
            || !Enrollment::where('student_id', $request->user()->id)
                ->where('class_id', $course->section->class_id)
                ->where('status', 'approved')
                ->exists(),
            403,
            'Not enrolled.'
        );
    }

    protected function ensureStudentCanAccessResource(Request $request, Resource $resource): void
    {
        abort_if(!$resource->is_visible, 403, 'Resource not available.');

        $resource->loadMissing('course.section');
        $this->ensureStudentCanAccessCourse($request, $resource->course);
    }

    protected function ensureStudentCanAccessExercise(Request $request, Exercise $exercise): void
    {
        $exercise->loadMissing('resource.course.section');
        $this->ensureStudentCanAccessResource($request, $exercise->resource);
    }

    protected function ensureCurrentUserCanAccessResource(Request $request, Resource $resource): void
    {
        if ($request->user()->role === 'student') {
            $this->ensureStudentCanAccessResource($request, $resource);
            return;
        }

        $this->ensureTeacherOwnsResource($request, $resource);
    }

    protected function ensureCurrentUserCanAccessExercise(Request $request, Exercise $exercise): void
    {
        if ($request->user()->role === 'student') {
            $this->ensureStudentCanAccessExercise($request, $exercise);
            return;
        }

        $this->ensureTeacherOwnsExercise($request, $exercise);
    }
}
