<?php

namespace Tests\Unit;

use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\ForumPost;
use App\Models\Message;
use App\Models\StudentProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class ModelRelationshipsTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_user_relationships_expose_courses_enrollments_messages_posts_and_progress(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course);
        $enrollment = $this->enroll($student, $course->section->schoolClass);
        $message = Message::create(['sender_id' => $teacher->id, 'receiver_id' => $student->id, 'content' => 'Bonjour']);
        $post = ForumPost::create(['course_id' => $course->id, 'user_id' => $student->id, 'title' => 'Question', 'content' => 'Besoin d’aide']);
        $progress = StudentProgress::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'resource_id' => $resource->id,
            'is_viewed' => true,
            'viewed_at' => now(),
        ]);

        $this->assertTrue($teacher->courses->contains($course));
        $this->assertTrue($student->enrollments->contains($enrollment));
        $this->assertTrue($teacher->sentMessages->contains($message));
        $this->assertTrue($student->receivedMessages->contains($message));
        $this->assertTrue($student->forumPosts->contains($post));
        $this->assertTrue($student->progress->contains($progress));
    }

    public function test_course_resource_exercise_and_submission_relationships_are_connected(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, ['type' => 'exercise', 'file_type' => 'file_upload']);
        $exercise = Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Rendu',
            'type' => 'file_upload',
            'max_score' => 20,
            'auto_correct' => false,
        ]);
        $submission = ExerciseSubmission::create([
            'exercise_id' => $exercise->id,
            'student_id' => $student->id,
            'content' => 'Rendu',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $this->assertTrue($course->resources->contains($resource));
        $this->assertTrue($resource->exercise->is($exercise));
        $this->assertTrue($exercise->submissions->contains($submission));
        $this->assertTrue($submission->student->is($student));
    }
}
