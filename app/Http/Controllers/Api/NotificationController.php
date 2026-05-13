<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    private const TYPES = [
        'teacher_message' => 'Messages professeur',
        'student_message' => 'Messages eleve',
        'forum_reply' => 'Reponses forum',
        'forum_post' => 'Publications forum',
        'enrollment_approved' => 'Inscriptions validees',
        'new_exercise' => 'Nouveaux exercices',
        'submission_corrected' => 'Corrections publiees',
    ];

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:all,read,unread'],
            'type' => ['nullable', 'string', 'max:80'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $baseQuery = Notification::where('user_id', $request->user()->id);

        $notificationsQuery = (clone $baseQuery)
            ->when(($validated['status'] ?? 'all') === 'read', fn ($query) => $query->whereNotNull('read_at'))
            ->when(($validated['status'] ?? 'all') === 'unread', fn ($query) => $query->whereNull('read_at'))
            ->when($validated['type'] ?? null, fn ($query, $type) => $query->where('type', $type));

        $notifications = $notificationsQuery
            ->latest()
            ->limit($validated['limit'] ?? 30)
            ->get();

        $unreadCount = (clone $baseQuery)
            ->whereNull('read_at')
            ->count();

        $typeCounts = (clone $baseQuery)
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
            'type_counts' => $typeCounts,
        ]);
    }

    public function markRead(Request $request, Notification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['notification' => $notification->fresh()]);
    }

    public function markUnread(Request $request, Notification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->update(['read_at' => null]);

        return response()->json(['notification' => $notification->fresh()]);
    }

    public function markAllRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifications marquees comme lues.']);
    }

    public function destroy(Request $request, Notification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->delete();

        return response()->noContent();
    }

    public function preferences(Request $request)
    {
        return response()->json([
            'types' => self::TYPES,
            'preferences' => $this->preferencesFor($request),
        ]);
    }

    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'preferences' => ['required', 'array'],
            'preferences.*' => ['boolean'],
        ]);

        $preferences = array_intersect_key($validated['preferences'], self::TYPES);
        $user = $request->user();
        $user->update([
            'notification_preferences' => array_replace($this->preferencesFor($request), $preferences),
        ]);

        return response()->json([
            'types' => self::TYPES,
            'preferences' => $user->fresh()->notification_preferences,
        ]);
    }

    private function preferencesFor(Request $request): array
    {
        return array_replace(
            array_fill_keys(array_keys(self::TYPES), true),
            $request->user()->notification_preferences ?? [],
        );
    }
}
