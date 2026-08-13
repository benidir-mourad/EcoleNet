<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\ExerciseSubmission;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Sert les fichiers pédagogiques depuis le disque privé.
 *
 * Ces routes portent le middleware `signed` : l'URL est émise par l'API à un
 * utilisateur déjà autorisé, et sa signature vaut autorisation pour une durée
 * courte. C'est ce qui permet de les utiliser dans un `src` d'iframe ou d'image,
 * qui ne peut pas porter d'en-tête Authorization.
 */
class FileController extends Controller
{
    public function resource(Request $request, Resource $resource): StreamedResponse
    {
        return $this->stream($resource->file_path, $resource->file_name);
    }

    public function submission(Request $request, ExerciseSubmission $submission): StreamedResponse
    {
        return $this->stream($submission->file_path, basename((string) $submission->file_path));
    }

    public function template(Request $request, Exercise $exercise): StreamedResponse
    {
        return $this->stream($exercise->template_file_path, $exercise->template_file_name);
    }

    private function stream(?string $path, ?string $downloadName): StreamedResponse
    {
        abort_if(!$path, 404, 'Aucun fichier associé.');

        $disk = Storage::disk('local');
        abort_if(!$disk->exists($path), 404, 'Fichier introuvable.');

        $name = $downloadName ?: basename($path);

        // inline : les PDF et pages HTML doivent s'afficher dans le visualiseur,
        // pas déclencher un téléchargement.
        return $disk->response($path, $name, [
            'Content-Disposition'     => 'inline; filename="' . addslashes($name) . '"',
            'X-Content-Type-Options'  => 'nosniff',
            'Content-Security-Policy' => "sandbox allow-scripts allow-forms; default-src 'self' data: blob:",
        ]);
    }
}
