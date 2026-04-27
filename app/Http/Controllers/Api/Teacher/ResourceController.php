<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResourceController extends Controller
{
    public function index(Course $course)
    {
        return response()->json(['resources' => $course->resources]);
    }

    public function store(Request $request, Course $course)
    {
        $data = $request->validate([
            'type'         => 'required|in:' . implode(',', Resource::TYPES),
            'file_type'    => 'nullable|in:pdf,pptx,docx,xlsx,image,video_upload,video_youtube,link,qcm,drag_drop,excel_interactive',
            'title'        => 'required|string|max:200',
            'external_url' => 'nullable|url',
            'is_visible'   => 'boolean',
        ]);

        $data['course_id'] = $course->id;
        $data['order'] = $course->resources()->max('order') + 1;

        $resource = Resource::create($data);

        return response()->json(['resource' => $resource], 201);
    }

    public function show(Resource $resource)
    {
        return response()->json(['resource' => $resource->load('qcmQuestions.options')]);
    }

    public function update(Request $request, Resource $resource)
    {
        $data = $request->validate([
            'file_type'    => 'nullable|in:pdf,pptx,docx,xlsx,image,video_upload,video_youtube,link,qcm,drag_drop,excel_interactive',
            'title'        => 'sometimes|string|max:200',
            'external_url' => 'nullable|url',
            'is_visible'   => 'boolean',
        ]);

        $resource->update($data);

        return response()->json(['resource' => $resource->fresh()]);
    }

    public function destroy(Resource $resource)
    {
        if ($resource->file_path) {
            Storage::delete($resource->file_path);
        }

        $resource->delete();
        return response()->json(['message' => 'Resource deleted.']);
    }

    public function toggleVisibility(Resource $resource)
    {
        $resource->update(['is_visible' => !$resource->is_visible]);
        return response()->json(['resource' => $resource->fresh()]);
    }

    public function uploadFile(Request $request, Resource $resource)
    {
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
            'pdf'  => 'pdf',
            'pptx' => 'pptx',
            'docx' => 'docx',
            'xlsx' => 'xlsx',
            'png', 'jpg', 'jpeg', 'gif', 'svg' => 'image',
            'mp4'  => 'video_upload',
            default => 'pdf',
        };
    }
}
