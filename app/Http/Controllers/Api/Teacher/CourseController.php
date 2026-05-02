<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CourseController extends Controller
{
    public function index(Section $section)
    {
        return response()->json(['courses' => $section->courses()->with('resources')->get()]);
    }

    public function store(Request $request, Section $section)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:200',
            'description' => 'nullable|string',
            'order'       => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);

        $data['section_id'] = $section->id;
        $data['teacher_id'] = $request->user()->id;
        $data['slug'] = Str::slug($data['name'] . '-' . uniqid());
        $data['order'] = $data['order'] ?? $section->courses()->max('order') + 1;

        $course = Course::create($data);

        return response()->json(['course' => $course->load('resources')], 201);
    }

    public function show(Course $course)
    {
        return response()->json([
            'course' => $course->load([
                'chapters.resources',
                'rootResources',
                'section.schoolClass',
            ]),
        ]);
    }

    public function update(Request $request, Course $course)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:200',
            'description' => 'nullable|string',
            'order'       => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name'] . '-' . $course->id);
        }

        $course->update($data);

        return response()->json(['course' => $course->fresh()->load('resources')]);
    }

    public function destroy(Course $course)
    {
        $course->delete();
        return response()->json(['message' => 'Course deleted.']);
    }
}
