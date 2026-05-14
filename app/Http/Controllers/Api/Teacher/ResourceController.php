<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Chapter;
use App\Models\Course;
use App\Models\Resource;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResourceController extends Controller
{
    use AuthorizesCourseAccess;

    public function index(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        return response()->json(['resources' => $course->resources]);
    }

    public function store(Request $request, Course $course)
    {
        $this->ensureTeacherOwnsCourse($request, $course);

        $data = $request->validate([
            'type'         => 'required|in:' . implode(',', Resource::TYPES),
            'file_type'    => 'nullable|in:pdf,pptx,docx,xlsx,image,video_upload,video_youtube,link,qcm,drag_drop,excel_interactive,file_upload,web_lesson',
            'title'        => 'required|string|max:200',
            'external_url' => 'nullable|url',
            'is_visible'   => 'boolean',
        ]);

        $data['course_id'] = $course->id;
        $data['order'] = $course->resources()->max('order') + 1;

        $resource = Resource::create($data);

        return response()->json(['resource' => $resource], 201);
    }

    public function storeForChapter(Request $request, Chapter $chapter)
    {
        $this->ensureTeacherOwnsChapter($request, $chapter);

        $data = $request->validate([
            'type'  => 'required|in:' . implode(',', Resource::TYPES),
            'title' => 'required|string|max:200',
        ]);

        $resource = Resource::create([
            'course_id'  => $chapter->course_id,
            'chapter_id' => $chapter->id,
            'type'       => $data['type'],
            'title'      => $data['title'],
            'is_visible' => false,
            'order'      => ($chapter->resources()->max('order') ?? 0) + 1,
        ]);

        return response()->json(['resource' => $resource], 201);
    }

    public function show(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        return response()->json(['resource' => $resource->load('qcmQuestions.options')]);
    }

    public function update(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $data = $request->validate([
            'file_type'    => 'nullable|in:pdf,pptx,docx,xlsx,image,video_upload,video_youtube,link,qcm,drag_drop,excel_interactive,file_upload,web_lesson',
            'title'        => 'sometimes|string|max:200',
            'external_url' => 'nullable|url',
            'is_visible'   => 'boolean',
        ]);

        $resource->update($data);

        return response()->json(['resource' => $resource->fresh()]);
    }

    public function destroy(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        if ($resource->file_path) {
            Storage::delete($resource->file_path);
        }

        $resource->delete();
        return response()->json(['message' => 'Resource deleted.']);
    }

    public function toggleVisibility(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $wasVisible = $resource->is_visible;
        $resource->update(['is_visible' => !$resource->is_visible]);
        $resource = $resource->fresh('exercise');

        if (!$wasVisible && $resource->is_visible && $resource->exercise) {
            app(NotificationService::class)->notifyNewExercise($resource, $resource->exercise);
        }

        return response()->json(['resource' => $resource]);
    }

    public function uploadFile(Request $request, Resource $resource)
    {
        $this->ensureTeacherOwnsResource($request, $resource);

        $request->validate([
            'file' => 'required|file|max:51200',
        ]);

        if ($resource->file_path) {
            Storage::delete($resource->file_path);
        }

        $file = $request->file('file');
        $path = $file->store('resources/' . $resource->course_id, 'public');

        $resource->update([
            'file_path'  => $path,
            'file_name'  => $file->getClientOriginalName(),
            'file_size'  => $file->getSize(),
            'file_type'  => $this->detectFileType($file->getClientOriginalExtension()),
        ]);

        return response()->json(['resource' => $resource->fresh()]);
    }

    private function detectFileType(string $ext): string
    {
        return match (strtolower($ext)) {
            'pdf'                        => 'pdf',
            'ppt', 'pptx'               => 'pptx',
            'doc', 'docx'               => 'docx',
            'xls', 'xlsx'               => 'xlsx',
            'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp' => 'image',
            'mp4', 'avi', 'mov', 'mkv'  => 'video_upload',
            default                     => 'pdf',
        };
    }
}
