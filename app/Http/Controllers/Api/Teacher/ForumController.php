<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Course;
use App\Models\ForumPost;
use Illuminate\Http\Request;

class ForumController extends Controller
{
    use AuthorizesCourseAccess;

    public function index(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

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
        $this->ensureTeacherOwnsCourse($request, $course);

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

        return response()->json(['post' => $post->load('user')], 201);
    }

    public function destroy(Request $request, ForumPost $post)
    {
        $this->ensureTeacherOwnsPost($request, $post);

        $post->delete();
        return response()->json(['message' => 'Post deleted.']);
    }

    public function reply(Request $request, ForumPost $post)
    {
        $this->ensureTeacherOwnsPost($request, $post);

        $data = $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        $reply = ForumPost::create([
            'course_id' => $post->course_id,
            'user_id'   => $request->user()->id,
            'parent_id' => $post->id,
            'content'   => $data['content'],
        ]);

        return response()->json(['reply' => $reply->load('user')], 201);
    }

    public function togglePin(Request $request, ForumPost $post)
    {
        $this->ensureTeacherOwnsPost($request, $post);

        $post->update(['is_pinned' => !$post->is_pinned]);
        return response()->json(['post' => $post->fresh()]);
    }
}
