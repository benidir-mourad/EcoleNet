<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'action'   => 'nullable|string|max:60',
            'actor_id' => 'nullable|integer|exists:users,id',
            'since'    => 'nullable|date',
            'per_page' => 'nullable|integer|min:10|max:200',
        ]);

        $entries = ActivityLog::query()
            ->when($filters['action'] ?? null, fn ($q, $action) => $q->where('action', $action))
            ->when($filters['actor_id'] ?? null, fn ($q, $id) => $q->where('actor_id', $id))
            ->when($filters['since'] ?? null, fn ($q, $since) => $q->where('created_at', '>=', $since))
            ->latest()
            ->paginate($filters['per_page'] ?? 50);

        return response()->json(['entries' => $entries]);
    }

    /** Alimente les filtres de l'interface sans coder la liste en dur côté client. */
    public function actions()
    {
        return response()->json([
            'actions' => ActivityLog::query()
                ->select('action')
                ->distinct()
                ->orderBy('action')
                ->pluck('action'),
        ]);
    }
}
