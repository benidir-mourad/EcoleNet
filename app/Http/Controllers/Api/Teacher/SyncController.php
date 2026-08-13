<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Synchronisation OneDrive depuis l'interface.
 *
 * Le geste le plus fréquent du produit — publier une correction de contenu —
 * imposait jusqu'ici d'ouvrir un terminal. L'aperçu s'appuie sur le mode dry-run
 * existant, de sorte que rien n'est écrit avant confirmation.
 */
class SyncController extends Controller
{
    public function status(Request $request)
    {
        $lastSynced = Resource::whereNotNull('source_hash')
            ->where('course_id', '!=', null)
            ->max('updated_at');

        return response()->json([
            'last_synced_at'   => $lastSynced,
            'synced_resources' => Resource::whereNotNull('source_path')->count(),
        ]);
    }

    public function preview(Request $request)
    {
        $data = $request->validate([
            'class' => 'nullable|string|max:50',
        ]);

        return response()->json($this->execute($data['class'] ?? null, dryRun: true));
    }

    public function run(Request $request)
    {
        $data = $request->validate([
            'class' => 'nullable|string|max:50',
            'prune' => 'boolean',
        ]);

        return response()->json(
            $this->execute($data['class'] ?? null, false, $data['prune'] ?? false)
        );
    }

    private function execute(?string $class, bool $dryRun, bool $prune = false): array
    {
        $options = array_filter([
            '--dry-run' => $dryRun ?: null,
            '--prune'   => $prune ?: null,
            '--class'   => $class,
        ], fn ($value) => $value !== null);

        $exitCode = Artisan::call('courses:sync', $options);
        $output = Artisan::output();

        // La commande résume son travail sur sa dernière ligne utile.
        $summary = collect(preg_split('/\r?\n/', trim($output)))
            ->filter(fn ($line) => str_starts_with(trim($line), 'Terminé'))
            ->last();

        return [
            'ok'      => $exitCode === 0,
            'summary' => $summary ? trim($summary) : 'Aucun résumé disponible.',
            'output'  => $output,
        ];
    }
}
