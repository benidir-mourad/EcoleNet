<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Http\Controllers\Controller;
use App\Models\Resource;
use App\Models\WebLesson;
use Illuminate\Http\Request;

class WebLessonController extends Controller
{
    use AuthorizesCourseAccess;

    public function show(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        return response()->json([
            'resource' => $resource,
            'lesson' => $resource->webLesson,
            'available_exercises' => $this->availableExerciseResources($resource),
        ]);
    }

    public function save(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $data = $request->validate([
            'content' => 'required|array',
            'content.pages' => 'required|array|min:1',
            'content.pages.*.title' => 'required|string|max:200',
            'content.pages.*.blocks' => 'nullable|array',
            'content.pages.*.blocks.*.type' => 'required|string|in:heading,paragraph,code,callout,fill_blank,quiz,exercise_link',
            'content.pages.*.blocks.*.text' => 'nullable|string|max:20000',
            'content.pages.*.blocks.*.prompt' => 'nullable|string|max:1000',
            'content.pages.*.blocks.*.question' => 'nullable|string|max:1000',
            'content.pages.*.blocks.*.exercise_resource_id' => 'nullable|integer|exists:resources,id',
            'content.pages.*.blocks.*.button_label' => 'nullable|string|max:100',
            'content.pages.*.blocks.*.code' => 'nullable|string|max:20000',
            'content.pages.*.blocks.*.language' => 'nullable|string|max:30',
            'content.pages.*.blocks.*.tone' => 'nullable|string|in:info,success,warning',
            'content.pages.*.blocks.*.case_sensitive' => 'boolean',
            'content.pages.*.blocks.*.options' => 'nullable|array',
            'content.pages.*.blocks.*.options.*.label' => 'required_with:content.pages.*.blocks.*.options|string|max:500',
            'content.pages.*.blocks.*.options.*.is_correct' => 'required_with:content.pages.*.blocks.*.options|boolean',
            'content.pages.*.blocks.*.explanation' => 'nullable|string|max:1000',
            'is_visible' => 'boolean',
        ]);

        $this->validateExerciseLinks($data['content'], $resource);

        $lesson = WebLesson::updateOrCreate(
            ['resource_id' => $resource->id],
            [
                'content' => $data['content'],
                'published_at' => ($data['is_visible'] ?? $resource->is_visible) ? now() : null,
            ]
        );

        $resource->update([
            'file_type' => 'web_lesson',
            'is_visible' => (bool) ($data['is_visible'] ?? $resource->is_visible),
        ]);

        return response()->json([
            'resource' => $resource->fresh(),
            'lesson' => $lesson->fresh(),
            'available_exercises' => $this->availableExerciseResources($resource->fresh()),
        ]);
    }

    private function availableExerciseResources(Resource $resource)
    {
        return Resource::query()
            ->where('course_id', $resource->course_id)
            ->where('id', '!=', $resource->id)
            ->whereIn('file_type', ['qcm', 'drag_drop', 'fill_blanks', 'ordering', 'code_editor', 'truth_table', 'file_upload'])
            ->orderBy('order')
            ->get(['id', 'title', 'type', 'file_type', 'is_visible']);
    }

    private function validateExerciseLinks(array $content, Resource $lessonResource): void
    {
        $ids = collect($content['pages'] ?? [])
            ->flatMap(fn ($page) => $page['blocks'] ?? [])
            ->filter(fn ($block) => ($block['type'] ?? null) === 'exercise_link')
            ->pluck('exercise_resource_id')
            ->filter()
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return;
        }

        $validCount = Resource::query()
            ->whereIn('id', $ids)
            ->where('course_id', $lessonResource->course_id)
            ->where('id', '!=', $lessonResource->id)
            ->whereIn('file_type', ['qcm', 'drag_drop', 'fill_blanks', 'ordering', 'code_editor', 'truth_table', 'file_upload'])
            ->count();

        abort_if($validCount !== $ids->count(), 422, 'Un exercice associe doit appartenir au meme cours.');
    }
}
