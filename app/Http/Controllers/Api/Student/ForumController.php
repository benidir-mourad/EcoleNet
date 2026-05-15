<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\ForumPost;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class ForumController extends Controller
{
    private function checkEnrolled(Request $request, Course $course): bool
    {
        return Enrollment::where('student_id', $request->user()->id)
            ->where('class_id', $course->section->class_id)
            ->where('status', 'approved')
            ->exists();
    }

    public function index(Request $request, Course $course)
    {
        if (!$this->checkEnrolled($request, $course)) {
            return response()->json(['message' => 'Non inscrit à ce cours.'], 403);
        }

        $posts = ForumPost::where('course_id', $course->id)
            ->whereNull('parent_id')
            ->with('user', 'replies.user')
            ->orderByDesc('is_pinned')
            ->latest()
            ->get();

        return response()->json(['posts' => $posts]);
    }

    public function store(Request $request, Course $course)
    {
        if (!$this->checkEnrolled($request, $course)) {
            return response()->json(['message' => 'Non inscrit à ce cours.'], 403);
        }

        $data = $request->validate([
            'title'   => 'nullable|string|max:200',
            'content' => 'required|string|max:5000',
        ]);

        $post = ForumPost::create([
            'course_id' => $course->id,
            'user_id'   => $request->user()->id,
            'title'     => $data['title'] ?? null,
            'content'   => $data['content'],
        ]);

        if ($course->teacher) {
            app(NotificationService::class)->create(
                $course->teacher,
                'forum_post',
                'Nouveau sujet forum',
                "{$request->user()->full_name} a publié un sujet dans {$course->name}.",
                ['course_id' => $course->id, 'post_id' => $post->id, 'url' => "/teacher/courses/{$course->id}/forum?post={$post->id}"]
            );
        }

        return response()->json(['post' => $post->load('user')], 201);
    }

    public function reply(Request $request, ForumPost $post)
    {
        $course = Course::findOrFail($post->course_id);

        if (!$this->checkEnrolled($request, $course)) {
            return response()->json(['message' => 'Non inscrit à ce cours.'], 403);
        }

        $data = $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        $reply = ForumPost::create([
            'course_id' => $post->course_id,
            'user_id'   => $request->user()->id,
            'parent_id' => $post->id,
            'content'   => $data['content'],
        ]);

        if ($post->user_id !== $request->user()->id) {
            app(NotificationService::class)->create(
                $post->user,
                'forum_reply',
                'Réponse forum',
                "{$request->user()->full_name} a répondu à ton sujet.",
                ['course_id' => $post->course_id, 'post_id' => $post->id, 'reply_id' => $reply->id, 'url' => "/student/courses/{$post->course_id}/forum?post={$post->id}"]
            );
        }

        return response()->json(['reply' => $reply->load('user')], 201);
    }

    public function destroy(Request $request, ForumPost $post)
    {
        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Interdit.'], 403);
        }

        $post->delete();

        return response()->json(['message' => 'Supprimé.']);
    }
}
