<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    use AuthorizesCourseAccess;

    public function pending(Request $request)
    {
        $enrollments = Enrollment::with('student', 'schoolClass')
            ->where('status', 'pending')
            ->whereIn('class_id', SchoolClass::manageableBy($request->user())->select('id'))
            ->latest()
            ->get();

        return response()->json(['enrollments' => $enrollments]);
    }

    public function approve(Request $request, Enrollment $enrollment)
    {
        // Valider une inscription active aussi le compte élève : ce chemin ne peut
        // pas rester ouvert aux classes d'un autre enseignant.
        $this->ensureTeacherOwnsEnrollment($request, $enrollment);

        $enrollment->update([
            'status'      => 'approved',
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
        ]);

        // Activate the student account if pending
        if ($enrollment->student->status === 'pending') {
            $enrollment->student->update(['status' => 'active']);
        }

        app(ActivityLogger::class)->record(
            ActivityLogger::ENROLLMENT_APPROVED,
            "Inscription de {$enrollment->student->full_name} validée dans {$enrollment->schoolClass->name}.",
            $enrollment,
            ['student_id' => $enrollment->student_id, 'class_id' => $enrollment->class_id],
        );

        app(NotificationService::class)->create(
            $enrollment->student,
            'enrollment_approved',
            'Inscription validée',
            "Ton inscription à {$enrollment->schoolClass->name} a été validée.",
            ['class_id' => $enrollment->class_id, 'url' => '/student/dashboard']
        );

        return response()->json(['enrollment' => $enrollment->fresh()->load('student', 'schoolClass')]);
    }

    public function reject(Request $request, Enrollment $enrollment)
    {
        $this->ensureTeacherOwnsEnrollment($request, $enrollment);

        $enrollment->update(['status' => 'rejected']);

        app(ActivityLogger::class)->record(
            ActivityLogger::ENROLLMENT_REJECTED,
            "Inscription de {$enrollment->student->full_name} refusée dans {$enrollment->schoolClass->name}.",
            $enrollment,
            ['student_id' => $enrollment->student_id, 'class_id' => $enrollment->class_id],
        );

        return response()->json(['enrollment' => $enrollment->fresh()->load('student', 'schoolClass')]);
    }

    public function classStudents(Request $request, SchoolClass $class)
    {
        $this->ensureTeacherOwnsClass($request, $class);

        $students = $class->students()->where('enrollments.status', 'approved')->get();

        return response()->json(['students' => $students]);
    }

    private function ensureTeacherOwnsEnrollment(Request $request, Enrollment $enrollment): void
    {
        $enrollment->loadMissing('schoolClass');

        abort_if(!$enrollment->schoolClass, 403, 'Forbidden.');

        $this->ensureTeacherOwnsClass($request, $enrollment->schoolClass);
    }
}
