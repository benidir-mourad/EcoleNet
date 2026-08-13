<?php

namespace App\Support;

use Illuminate\Support\Facades\URL;

/**
 * Fabrique les URL signées des fichiers pédagogiques.
 *
 * La durée est volontairement large : une URL trop courte casserait un PDF resté
 * ouvert un moment dans le visualiseur. Elle reste bornée pour qu'un lien recopié
 * hors de l'application cesse de fonctionner.
 */
class SignedFileUrl
{
    public const LIFETIME_HOURS = 6;

    public static function make(string $route, string $parameter, int|string $id): ?string
    {
        // Hors contexte HTTP — commandes Artisan, seeders — la génération d'URL n'a
        // pas de sens et ne doit pas faire échouer la sérialisation du modèle.
        try {
            return URL::temporarySignedRoute(
                $route,
                now()->addHours(self::LIFETIME_HOURS),
                [$parameter => $id]
            );
        } catch (\Throwable) {
            return null;
        }
    }
}
