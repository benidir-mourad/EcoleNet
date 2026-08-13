<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\SchoolClass;
use App\Services\GradeExporter;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GradeExportController extends Controller
{
    use AuthorizesCourseAccess;

    public function __invoke(Request $request, SchoolClass $class, GradeExporter $exporter)
    {
        $this->ensureTeacherOwnsClass($request, $class);

        $filename = 'notes-' . Str::slug($class->name) . '-' . now()->format('Y-m-d') . '.xlsx';

        return response()->streamDownload(
            fn () => print($exporter->toString($class)),
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'no-store',
            ]
        );
    }
}
