<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Http\Controllers\Controller;
use App\Models\Resource;
use Illuminate\Http\Request;

class WebLessonController extends Controller
{
    use AuthorizesCourseAccess;

    public function show(Request $request, Resource $resource)
    {
        $this->ensureStudentCanAccessResource($request, $resource);

        abort_if($resource->file_type !== 'web_lesson' || !$resource->webLesson, 404, 'Lesson not found.');

        return response()->json([
            'resource' => $resource,
            'lesson' => $this->withLinkedExercises($resource),
        ]);
    }

    private function withLinkedExercises(Resource $resource)
    {
        $lesson = $resource->webLesson;
        $content = $lesson->content ?? [];
        $ids = collect($content['pages'] ?? [])
            ->flatMap(fn ($page) => $page['blocks'] ?? [])
            ->filter(fn ($block) => ($block['type'] ?? null) === 'exercise_link')
            ->pluck('exercise_resource_id')
            ->filter()
            ->unique()
            ->values();

        $linkedResources = Resource::query()
            ->whereIn('id', $ids)
            ->where('course_id', $resource->course_id)
            ->where('is_visible', true)
            ->whereIn('file_type', ['qcm', 'drag_drop', 'fill_blanks', 'ordering', 'code_editor', 'truth_table', 'file_upload'])
            ->get(['id', 'title', 'type', 'file_type'])
            ->keyBy('id');

        $content['pages'] = collect($content['pages'] ?? [])->map(function ($page) use ($linkedResources) {
            $page['blocks'] = collect($page['blocks'] ?? [])->map(function ($block) use ($linkedResources) {
                if (($block['type'] ?? null) === 'exercise_link') {
                    $id = $block['exercise_resource_id'] ?? null;
                    $block['linked_resource'] = $id ? $linkedResources->get($id) : null;
                }

                return $block;
            })->all();

            return $page;
        })->all();

        $lesson->content = $content;

        return $lesson;
    }
}
