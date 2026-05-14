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
            'lesson' => $resource->webLesson,
        ]);
    }
}
