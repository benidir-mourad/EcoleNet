<?php

namespace Tests\Feature;

use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class NotificationCenterApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_user_can_filter_notifications_by_status_and_type(): void
    {
        $student = $this->user('student');

        Notification::create([
            'user_id' => $student->id,
            'type' => 'teacher_message',
            'title' => 'Nouveau message',
            'body' => 'Bonjour',
        ]);

        Notification::create([
            'user_id' => $student->id,
            'type' => 'forum_reply',
            'title' => 'Reponse forum',
            'read_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/notifications?status=unread&type=teacher_message')
            ->assertOk()
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('notifications.0.type', 'teacher_message')
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('type_counts.teacher_message', 1)
            ->assertJsonPath('type_counts.forum_reply', 1);
    }

    public function test_user_can_mark_notification_unread_and_delete_it(): void
    {
        $student = $this->user('student');

        $notification = Notification::create([
            'user_id' => $student->id,
            'type' => 'teacher_message',
            'title' => 'Nouveau message',
            'read_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
            ->patchJson("/api/notifications/{$notification->id}/unread")
            ->assertOk()
            ->assertJsonPath('notification.read_at', null);

        $this->actingAs($student, 'sanctum')
            ->deleteJson("/api/notifications/{$notification->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('internal_notifications', [
            'id' => $notification->id,
        ]);
    }

    public function test_user_cannot_delete_another_users_notification(): void
    {
        $student = $this->user('student');
        $other = $this->user('student');

        $notification = Notification::create([
            'user_id' => $student->id,
            'type' => 'teacher_message',
            'title' => 'Nouveau message',
        ]);

        $this->actingAs($other, 'sanctum')
            ->deleteJson("/api/notifications/{$notification->id}")
            ->assertForbidden();
    }

    public function test_user_can_update_notification_preferences(): void
    {
        $student = $this->user('student');

        $this->actingAs($student, 'sanctum')
            ->putJson('/api/notifications/preferences', [
                'preferences' => [
                    'teacher_message' => false,
                    'forum_reply' => true,
                    'unknown_type' => false,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('preferences.teacher_message', false)
            ->assertJsonPath('preferences.forum_reply', true)
            ->assertJsonMissingPath('preferences.unknown_type');

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/notifications/preferences')
            ->assertOk()
            ->assertJsonPath('preferences.teacher_message', false);
    }

    public function test_disabled_notification_type_is_not_created(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student', 'active', [
            'notification_preferences' => ['teacher_message' => false],
        ]);
        $this->enroll($student, $this->schoolClass());

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/messages/{$student->id}", ['content' => 'Bonjour'])
            ->assertCreated();

        $this->assertDatabaseMissing('internal_notifications', [
            'user_id' => $student->id,
            'type' => 'teacher_message',
        ]);
    }
}
