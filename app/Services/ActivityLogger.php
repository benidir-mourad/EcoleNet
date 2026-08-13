<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Journalise les actions sensibles : validation d'inscription, changement de
 * statut d'un compte, suppression de contenu, correction d'une copie.
 *
 * L'écriture ne doit jamais faire échouer l'action journalisée — un incident de
 * journalisation empêcherait un enseignant de valider une inscription.
 */
class ActivityLogger
{
    public const ENROLLMENT_APPROVED = 'enrollment.approved';
    public const ENROLLMENT_REJECTED = 'enrollment.rejected';
    public const USER_STATUS_CHANGED = 'user.status_changed';
    public const USER_DELETED        = 'user.deleted';
    public const CLASS_DELETED       = 'class.deleted';
    public const SECTION_DELETED     = 'section.deleted';
    public const COURSE_DELETED      = 'course.deleted';
    public const SUBMISSION_CORRECTED = 'submission.corrected';
    public const SYNC_RUN            = 'sync.run';

    public function record(
        string $action,
        string $summary,
        ?Model $subject = null,
        array $context = [],
        ?User $actor = null,
    ): void {
        try {
            $actor ??= auth()->user();

            ActivityLog::create([
                'actor_id'     => $actor?->id,
                // Conservé en clair : le compte peut être supprimé plus tard, et une
                // trace sans auteur identifiable ne sert à rien.
                'actor_label'  => $actor?->full_name ?? $actor?->email ?? 'Système',
                'action'       => $action,
                'subject_type' => $subject ? class_basename($subject) : null,
                'subject_id'   => $subject?->getKey(),
                'summary'      => mb_substr($summary, 0, 255),
                'context'      => $context ?: null,
                'ip'           => request()?->ip(),
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Journalisation impossible.', [
                'action' => $action,
                'error'  => $exception->getMessage(),
            ]);
        }
    }
}
