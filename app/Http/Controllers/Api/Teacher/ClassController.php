<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClassController extends Controller
{
    use AuthorizesCourseAccess;

    public function index(Request $request)
    {
        $classes = SchoolClass::manageableBy($request->user())
            ->with('sections.courses')
            ->orderBy('year')
            ->get();

        return response()->json(['classes' => $classes]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string',
            'year'        => 'nullable|string|max:20',
            'is_active'   => 'boolean',
        ]);

        $data['slug'] = Str::slug($data['name'] . '-' . uniqid());
        $data['teacher_id'] = $request->user()->id;

        $class = SchoolClass::create($data);

        return response()->json(['class' => $class], 201);
    }

    public function show(Request $request, SchoolClass $class)
    {
        $this->ensureTeacherOwnsClass($request, $class);

        return response()->json(['class' => $class->load('sections.courses')]);
    }

    public function update(Request $request, SchoolClass $class)
    {
        $this->ensureTeacherOwnsClass($request, $class);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'year'        => 'nullable|string|max:20',
            'is_active'   => 'boolean',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name'] . '-' . $class->id);
        }

        $class->update($data);

        return response()->json(['class' => $class->fresh()]);
    }

    public function destroy(Request $request, SchoolClass $class)
    {
        $this->ensureTeacherOwnsClass($request, $class);

        $class->delete();

        return response()->json(['message' => 'Class deleted.']);
    }
}
