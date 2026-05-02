<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Course;
use Illuminate\Http\Request;

class ChapterController extends Controller
{
    public function store(Request $request, Course $course)
    {
        $data = $request->validate(['title' => 'required|string|max:200']);

        $chapter = Chapter::create([
            'course_id' => $course->id,
            'title'     => $data['title'],
            'order'     => $course->chapters()->max('order') + 1,
        ]);

        return response()->json(['chapter' => $chapter->load('resources')], 201);
    }

    public function update(Request $request, Chapter $chapter)
    {
        $data = $request->validate(['title' => 'required|string|max:200']);
        $chapter->update($data);
        return response()->json(['chapter' => $chapter]);
    }

    public function destroy(Chapter $chapter)
    {
        $chapter->delete();
        return response()->json(['message' => 'Chapter deleted.']);
    }
}
