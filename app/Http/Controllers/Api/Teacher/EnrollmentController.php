<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesCourseAccess;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Models\StudentProgress;
use App\Models\Resource;
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

        $enrollments = Enrollment::where('class_id', $class->id)
            ->where('status', 'approved')
            ->with('student')
            ->get()
            ->filter(fn ($enrollment) => $enrollment->student);

        // Ressources visibles de la classe : dénominateur de la progression.
        $visibleResourceIds = Resource::query()
            ->where('is_visible', true)
            ->whereHas('course.section', fn ($q) => $q->where('class_id', $class->id))
            ->pluck('id');

        // Une requête pour toute la classe, pas une par élève.
        $viewsByStudent = StudentProgress::whereIn('student_id', $enrollments->pluck('student_id'))
            ->whereIn('resource_id', $visibleResourceIds)
            ->where('is_viewed', true)
            ->get(['student_id', 'viewed_at'])
            ->groupBy('student_id');

        $total = $visibleResourceIds->count();

        $students = $enrollments
            ->map(function ($enrollment) use ($viewsByStudent, $total) {
                $views = $viewsByStudent->get($enrollment->student_id, collect());

                return [
                    'id'               => $enrollment->student->id,
                    'enrollment_id'    => $enrollment->id,
                    'first_name'       => $enrollment->student->first_name,
                    'last_name'        => $enrollment->student->last_name,
                    'full_name'        => $enrollment->student->full_name,
                    'email'            => $enrollment->student->email,
                    'avatar'           => $enrollment->student->avatar,
                    'status'           => $enrollment->student->status,
                    'enrolled_at'      => $enrollment->approved_at ?? $enrollment->created_at,
                    'viewed_resources' => $views->count(),
                    'total_resources'  => $total,
                    'progress_percent' => $total > 0 ? (int) round(($views->count() / $total) * 100) : 0,
                    'last_activity_at' => $views->max('viewed_at'),
                ];
            })
            ->sortBy(fn ($student) => mb_strtolower($student['last_name'] . $student['first_name']))
            ->values();

        return response()->json([
            'students' => $students,
            'class'    => ['id' => $class->id, 'name' => $class->name],
        ]);
    }

    /**
     * Déplace un élève vers une autre classe.
     *
     * Ce geste n'était possible d'aucun côté : `Student\DashboardController::enroll()`
     * refuse une seconde demande tant qu'une inscription est active, et rien côté
     * enseignant ne permettait de la modifier. Un changement de classe imposait donc
     * de passer par la base.
     */
    public function transfer(Request $request, Enrollment $enrollment)
    {
        $this->ensureTeacherOwnsEnrollment($request, $enrollment);

        $data = $request->validate([
            'class_id' => 'required|exists:classes,id|different:' . $enrollment->class_id,
        ]);

        $target = SchoolClass::findOrFail($data['class_id']);

        // On ne déplace que vers une classe que l'on gère, sinon l'élève sortirait
        // du périmètre de l'enseignant sans que personne ne puisse le reprendre.
        $this->ensureTeacherOwnsClass($request, $target);

        $alreadyThere = Enrollment::where('student_id', $enrollment->student_id)
            ->where('class_id', $target->id)
            ->exists();

        if ($alreadyThere) {
            return response()->json([
                'message' => 'Cet élève a déjà une inscription dans ' . $target->name . '.',
            ], 422);
        }

        $from = $enrollment->schoolClass->name;
        $enrollment->update(['class_id' => $target->id]);

        app(ActivityLogger::class)->record(
            ActivityLogger::ENROLLMENT_TRANSFERRED,
            "{$enrollment->student->full_name} déplacé de {$from} vers {$target->name}.",
            $enrollment,
            ['student_id' => $enrollment->student_id, 'from' => $from, 'to' => $target->name],
        );

        app(NotificationService::class)->create(
            $enrollment->student,
            'enrollment_transferred',
            'Changement de classe',
            "Tu fais désormais partie de la classe {$target->name}.",
            ['class_id' => $target->id, 'url' => '/student/dashboard'],
        );

        return response()->json([
            'enrollment' => $enrollment->fresh()->load('student', 'schoolClass'),
            'message'    => "Élève déplacé vers {$target->name}.",
        ]);
    }

    private function ensureTeacherOwnsEnrollment(Request $request, Enrollment $enrollment): void
    {
        $enrollment->loadMissing('schoolClass');

        abort_if(!$enrollment->schoolClass, 403, 'Forbidden.');

        $this->ensureTeacherOwnsClass($request, $enrollment->schoolClass);
    }
}
