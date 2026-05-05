<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Chapter;
use App\Models\Course;
use Illuminate\Http\Request;

class ChapterController extends Controller
{
    use AuthorizesCourseAccess;

    public function store(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        $data = $request->validate(['title' => 'required|string|max:200']);

        $chapter = Chapter::create([
            'course_id' => $course->id,
            'title'     => $data['title'],
            'order'     => ($course->chapters()->max('order') ?? 0) + 1,
        ]);

        return response()->json(['chapter' => $chapter->load('resources')], 201);
    }

    public function update(Request $request, Chapter $chapter)
    {
        $this->ensureTeacherOwnsChapter($request, $chapter);

        $data = $request->validate(['title' => 'required|string|max:200']);
        $chapter->update($data);
        return response()->json(['chapter' => $chapter]);
    }

    public function destroy(Request $request, Chapter $chapter)
    {
        $this->ensureTeacherOwnsChapter($request, $chapter);

        $chapter->delete();
        return response()->json(['message' => 'Chapter deleted.']);
    }
}
