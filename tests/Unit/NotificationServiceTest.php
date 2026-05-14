<?php

namespace Tests\Unit;

use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_service_creates_notification_for_user(): void
    {
        $student = $this->user('student');

        $notification = app(NotificationService::class)->create(
            $student,
            'manual',
            'Titre',
            'Contenu',
            ['url' => '/student/dashboard']
        );

        $this->assertSame($student->id, $notification->user_id);
        $this->assertSame('manual', $notification->type);
        $this->assertSame('/student/dashboard', $notification->data['url']);
    }

    public function test_service_notifies_only_approved_students_of_course_class(): void
    {
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course);
        $approved = $this->user('student');
        $pending = $this->user('student');
        $outsider = $this->user('student');
        $this->enroll($approved, $course->section->schoolClass, 'approved');
        $this->enroll($pending, $course->section->schoolClass, 'pending');
        $this->enroll($outsider, $this->schoolClass(), 'approved');

        app(NotificationService::class)->notifyCourseStudents(
            $resource,
            'new_exercise',
            'Nouveau devoir',
            'À faire'
        );

        $this->assertDatabaseHas('internal_notifications', ['user_id' => $approved->id, 'type' => 'new_exercise']);
        $this->assertDatabaseMissing('internal_notifications', ['user_id' => $pending->id, 'type' => 'new_exercise']);
        $this->assertDatabaseMissing('internal_notifications', ['user_id' => $outsider->id, 'type' => 'new_exercise']);
    }
}
