<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\ForumPost;
use Illuminate\Http\Request;

class ForumController extends Controller
{
    public function index(Course $course)
    {
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

    public function destroy(ForumPost $post)
    {
        $post->delete();
        return response()->json(['message' => 'Post deleted.']);
    }

    public function togglePin(ForumPost $post)
    {
        $post->update(['is_pinned' => !$post->is_pinned]);
        return response()->json(['post' => $post->fresh()]);
    }
}
