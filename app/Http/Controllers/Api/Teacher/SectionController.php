<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\SchoolClass;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SectionController extends Controller
{
    use AuthorizesCourseAccess;

    public function index(Request $request, SchoolClass $class)
    {
        $this->ensureTeacherOwnsClass($request, $class);

        return response()->json(['sections' => $class->sections()->with('courses')->get()]);
    }

    public function store(Request $request, SchoolClass $class)
    {
        $this->ensureTeacherOwnsClass($request, $class);

        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string',
            'order'       => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);

        $data['class_id'] = $class->id;
        $data['slug'] = Str::slug($data['name'] . '-' . uniqid());
        $data['order'] = $data['order'] ?? $class->sections()->max('order') + 1;

        $section = Section::create($data);

        return response()->json(['section' => $section], 201);
    }

    public function show(Request $request, Section $section)
    {
        $this->ensureTeacherOwnsSection($request, $section);

        return response()->json(['section' => $section->load('courses')]);
    }

    public function update(Request $request, Section $section)
    {
        $this->ensureTeacherOwnsSection($request, $section);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'order'       => 'integer|min:0',
            'is_active'   => 'boolean',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name'] . '-' . $section->id);
        }

        $section->update($data);

        return response()->json(['section' => $section->fresh()]);
    }

    public function destroy(Request $request, Section $section)
    {
        $this->ensureTeacherOwnsSection($request, $section);

        // La suppression cascade désormais réellement vers les cours, leurs
        // ressources et les progressions associées.
        $section->delete();

        return response()->json(['message' => 'Section deleted.']);
    }
}
