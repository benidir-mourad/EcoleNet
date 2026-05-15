<?php

namespace Tests\Feature;

use App\Models\ForumPost;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class ForumMessagingApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_student_can_create_forum_post_and_teacher_can_pin_it(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $this->enroll($student, $course->section->schoolClass);

        $postId = $this->actingAs($student, 'sanctum')
            ->postJson("/api/student/courses/{$course->id}/forum", [
                'title' => 'Question réseau',
                'content' => 'Quelle est la différence entre TCP et UDP ?',
            ])
            ->assertCreated()
            ->assertJsonPath('post.title', 'Question réseau')
            ->json('post.id');

        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $teacher->id,
            'type' => 'forum_post',
            'data->url' => "/teacher/courses/{$course->id}/forum?post={$postId}",
        ]);

        $postId = $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/forum/{$postId}/pin")
            ->assertOk()
            ->assertJsonPath('post.is_pinned', true);
    }

    public function test_teacher_forum_post_notifies_enrolled_students_only(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $outsider = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $this->enroll($student, $course->section->schoolClass);
        $this->enroll($outsider, $this->schoolClass());

        $postId = $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/courses/{$course->id}/forum", [
                'title' => 'Annonce',
                'content' => 'Contrôle vendredi.',
            ])
            ->assertCreated()
            ->json('post.id');

        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $student->id,
            'type' => 'forum_post',
            'data->url' => "/student/courses/{$course->id}/forum?post={$postId}",
        ]);
        $this->assertDatabaseMissing('internal_notifications', ['user_id' => $outsider->id, 'type' => 'forum_post']);
    }

    public function test_student_cannot_post_forum_without_enrollment_or_delete_other_post(): void
    {
        $student = $this->user('student');
        $other = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $post = ForumPost::create([
            'course_id' => $course->id,
            'user_id' => $other->id,
            'title' => 'Sujet',
            'content' => 'Contenu',
        ]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($other, 'sanctum')
            ->postJson("/api/student/courses/{$course->id}/forum", ['content' => 'Non inscrit'])
            ->assertForbidden();

        $this->actingAs($student, 'sanctum')
            ->deleteJson("/api/student/forum/{$post->id}")
            ->assertForbidden();
    }

    public function test_message_conversation_marks_received_messages_as_read(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $message = Message::create([
            'sender_id' => $student->id,
            'receiver_id' => $teacher->id,
            'content' => 'Question',
            'is_read' => false,
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->getJson("/api/teacher/messages/{$student->id}")
            ->assertOk()
            ->assertJsonCount(1, 'messages');

        $this->assertTrue($message->fresh()->is_read);
        $this->assertNotNull($message->fresh()->read_at);
    }

    public function test_student_send_message_creates_teacher_conversation_and_notification(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');

        $messageId = $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/messages', ['content' => 'Bonjour professeur'])
            ->assertCreated()
            ->assertJsonPath('message.receiver_id', $teacher->id)
            ->json('message.id');

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/teacher/messages')
            ->assertOk()
            ->assertJsonCount(1, 'conversations');

        $this->assertDatabaseHas('internal_notifications', [
            'user_id' => $teacher->id,
            'type' => 'student_message',
            'data->url' => "/teacher/messages?user={$student->id}&message={$messageId}",
        ]);
    }
}
