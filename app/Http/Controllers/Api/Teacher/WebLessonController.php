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
            'content.pages.*.blocks.*.type' => 'required|string|in:heading,paragraph,code,callout,fill_blank,quiz',
            'content.pages.*.blocks.*.text' => 'nullable|string|max:20000',
            'content.pages.*.blocks.*.prompt' => 'nullable|string|max:1000',
            'content.pages.*.blocks.*.question' => 'nullable|string|max:1000',
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
        ]);
    }
}
