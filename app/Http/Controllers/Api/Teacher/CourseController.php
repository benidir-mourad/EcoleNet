<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Course;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CourseController extends Controller
{
    use AuthorizesCourseAccess;

    public function index(Request $request, Section $section)
    {
        $courses = $section->courses()
            ->where('is_archived', false)
            ->when($request->user()->role !== 'admin', fn ($q) => $q->where('teacher_id', $request->user()->id))
            ->with('resources')
            ->get();

        return response()->json(['courses' => $courses]);
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
        $data['order'] = $data['order'] ?? (($section->courses()->max('order') ?? 0) + 1);

        $course = Course::create($data);

        return response()->json(['course' => $course->load('resources')], 201);
    }

    public function show(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

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
        $this->ensureTeacherOwnsCourse($request, $course);

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

    public function destroy(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        $course->delete();
        return response()->json(['message' => 'Course deleted.']);
    }

    // ── Library ───────────────────────────────────────────────────────────────

    public function library(Request $request)
    {
        $courses = Course::where('teacher_id', $request->user()->id)
            ->where('is_archived', true)
            ->with(['chapters.resources.exercise', 'rootResources.exercise'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['courses' => $courses]);
    }

    public function archive(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        $course->update(['is_archived' => true, 'section_id' => null]);
        return response()->json(['message' => 'Cours archivé dans la bibliothèque.']);
    }

    public function assignToSection(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        $request->validate(['section_id' => 'required|exists:sections,id']);

        $newCourse = DB::transaction(function () use ($course, $request) {
            $section = Section::findOrFail($request->section_id);

            $newCourse = Course::create([
                'section_id'  => $section->id,
                'teacher_id'  => $request->user()->id,
                'name'        => $course->name,
                'slug'        => Str::slug($course->name . '-' . uniqid()),
                'description' => $course->description,
                'order'       => ($section->courses()->max('order') ?? 0) + 1,
                'is_active'   => true,
                'is_archived' => false,
            ]);

            // Clone chapters + resources
            $chapters = $course->chapters()->with('resources.exercise')->get();
            foreach ($chapters as $ch) {
                $newChapter = $newCourse->chapters()->create([
                    'title' => $ch->title,
                    'order' => $ch->order,
                ]);
                $this->cloneResources($ch->resources, $newCourse->id, $newChapter->id);
            }

            // Clone root resources — auto-create a chapter so students can access them
            $rootResources = $course->rootResources()->with('exercise')->get();
            if ($rootResources->isNotEmpty()) {
                $nextOrder = $chapters->max('order') + 1;
                $defaultChapter = $newCourse->chapters()->create([
                    'title' => 'Cours',
                    'order' => $nextOrder,
                ]);
                $this->cloneResources($rootResources, $newCourse->id, $defaultChapter->id);
            }

            return $newCourse;
        });

        return response()->json([
            'message' => 'Cours attribué avec succès.',
            'course'  => $newCourse->load(['chapters.resources', 'section.schoolClass']),
        ], 201);
    }

    private function cloneResources($resources, int $courseId, ?int $chapterId): void
    {
        foreach ($resources as $res) {
            $newRes = \App\Models\Resource::create([
                'course_id'    => $courseId,
                'chapter_id'   => $chapterId,
                'type'         => $res->type,
                'file_type'    => $res->file_type,
                'title'        => $res->title,
                'file_path'    => $res->file_path,
                'file_name'    => $res->file_name,
                'file_size'    => $res->file_size,
                'external_url' => $res->external_url,
                'is_visible'   => $res->is_visible,
                'order'        => $res->order,
            ]);

            // Clone exercise (fill_blanks, ordering, code_editor, truth_table, drag_drop, file_upload)
            if ($res->exercise) {
                $ex = $res->exercise;
                \App\Models\Exercise::create([
                    'resource_id'        => $newRes->id,
                    'title'              => $ex->title,
                    'instructions'       => $ex->instructions,
                    'type'               => $ex->type,
                    'content'            => $ex->content,
                    'max_score'          => $ex->max_score,
                    'auto_correct'       => $ex->auto_correct,
                    'deadline'           => null, // don't copy deadline
                    'template_file_path' => $ex->template_file_path,
                    'template_file_name' => $ex->template_file_name,
                ]);
            }

            // Clone QCM questions + options
            if ($res->file_type === 'qcm') {
                $questions = $res->qcmQuestions()->with('options')->get();
                foreach ($questions as $q) {
                    $newQ = \App\Models\QcmQuestion::create([
                        'resource_id' => $newRes->id,
                        'question'    => $q->question,
                        'order'       => $q->order,
                        'points'      => $q->points,
                        'explanation' => $q->explanation,
                    ]);
                    foreach ($q->options as $opt) {
                        \App\Models\QcmOption::create([
                            'question_id' => $newQ->id,
                            'label'       => $opt->label,
                            'is_correct'  => $opt->is_correct,
                            'order'       => $opt->order,
                        ]);
                    }
                }
            }
        }
    }

    public function organizeRootResources(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        $rootResources = $course->rootResources()->get();

        if ($rootResources->isEmpty()) {
            return response()->json(['message' => 'Aucune ressource sans chapitre.']);
        }

        $chapter = $course->chapters()->create([
            'title' => 'Cours',
            'order' => ($course->chapters()->max('order') ?? 0) + 1,
        ]);

        \App\Models\Resource::whereIn('id', $rootResources->pluck('id'))
            ->update(['chapter_id' => $chapter->id]);

        return response()->json([
            'message' => 'Ressources organisées dans le chapitre "Cours".',
            'course'  => $course->load(['chapters.resources', 'rootResources', 'section.schoolClass']),
        ]);
    }

    public function destroyFromLibrary(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        $course->delete();
        return response()->json(['message' => 'Cours supprimé de la bibliothèque.']);
    }
}
