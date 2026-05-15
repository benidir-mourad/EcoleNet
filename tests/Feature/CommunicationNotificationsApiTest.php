<?php

namespace Tests\Feature;

use App\Models\ForumPost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class CommunicationNotificationsApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_teacher_message_creates_student_notification_and_can_be_marked_read(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');

        $notificationId = $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/messages/{$student->id}", ['content' => 'Bonjour'])
            ->assertCreated()
            ->json('message.id');

        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $student->id,
            'type' => 'teacher_message',
        ]);

        $notification = $this->actingAs($student, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.data.message_id', $notificationId)
            ->assertJsonPath('notifications.0.data.url', "/student/messages?message={$notificationId}")
            ->json('notifications.0');

        $this->actingAs($student, 'sanctum')
            ->patchJson("/api/notifications/{$notification['id']}/read")
            ->assertOk()
            ->assertJsonPath('notification.read_at', fn($value) => !empty($value));

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 0);
    }

    public function test_user_cannot_mark_someone_elses_notification_as_read(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $other = $this->user('student');

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/messages/{$student->id}", ['content' => 'Bonjour'])
            ->assertCreated();

        $notificationId = $this->actingAs($student, 'sanctum')
            ->getJson('/api/notifications')
            ->json('notifications.0.id');

        $this->actingAs($other, 'sanctum')
            ->patchJson("/api/notifications/{$notificationId}/read")
            ->assertForbidden();
    }

    public function test_forum_reply_notifies_original_author(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $this->enroll($student, $course->section->schoolClass);

        $post = ForumPost::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'title' => 'Question',
            'content' => 'Je bloque sur l’exercice.',
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/forum/{$post->id}/reply", ['content' => 'Je réponds ici.'])
            ->assertCreated();

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('notifications.0.type', 'forum_reply')
            ->assertJsonPath('notifications.0.data.post_id', $post->id)
            ->assertJsonPath('notifications.0.data.url', "/student/courses/{$course->id}/forum?post={$post->id}");
    }
}
