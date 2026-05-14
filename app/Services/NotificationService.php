<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Exercise;
use App\Models\Notification;
use App\Models\Resource;
use App\Models\User;

class NotificationService
{
    public function create(User $user, string $type, string $title, ?string $body = null, array $data = []): Notification
    {
        if ($this->isDisabledForUser($user, $type)) {
            return new Notification();
        }

        return Notification::create([
            'user_id' => $user->id,
            'type'    => $type,
            'title'   => $title,
            'body'    => $body,
            'data'    => $data ?: null,
        ]);
    }

    public function notifyCourseStudents(Resource $resource, string $type, string $title, ?string $body = null, array $data = []): void
    {
        $resource->loadMissing('course.section');

        if (!$resource->course?->section) {
            return;
        }

        $this->notifyCourseStudentsForCourse($resource->course, $type, $title, $body, $data);
    }

    public function notifyCourseStudentsForCourse(Course $course, string $type, string $title, ?string $body = null, array $data = []): void
    {
        $course->loadMissing('section');

        if (!$course->section) {
            return;
        }

        $students = User::where('role', 'student')
            ->whereHas('enrollments', function ($query) use ($course) {
                $query->where('class_id', $course->section->class_id)
                    ->where('status', 'approved');
            })
            ->get();

        foreach ($students as $student) {
            $this->create($student, $type, $title, $body, $data);
        }
    }

    public function notifyNewExercise(Resource $resource, Exercise $exercise): void
    {
        if (!$resource->is_visible) {
            return;
        }

        if (Notification::where('type', 'new_exercise')
            ->where('data->exercise_id', $exercise->id)
            ->exists()) {
            return;
        }

        $this->notifyCourseStudents(
            $resource,
            'new_exercise',
            'Nouveau devoir',
            "Un nouveau devoir est disponible : {$exercise->title}.",
            [
                'exercise_id' => $exercise->id,
                'resource_id' => $resource->id,
                'course_id'   => $resource->course_id,
                'deadline'    => $exercise->deadline,
                'url'         => "/student/courses/{$resource->course_id}",
            ]
        );
    }

    private function isDisabledForUser(User $user, string $type): bool
    {
        $preferences = $user->notification_preferences ?? [];

        return array_key_exists($type, $preferences) && $preferences[$type] === false;
    }
}
