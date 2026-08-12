<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Drapeau à ajouter aux rôles pour ouvrir une route aux comptes en attente :
     * `role:student,allow-pending`. Un compte `pending` n'a pas d'autre moyen de
     * demander son inscription à une classe, or c'est cette demande, une fois
     * validée par le professeur, qui active son compte.
     */
    private const ALLOW_PENDING = 'allow-pending';

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $allowPending = in_array(self::ALLOW_PENDING, $roles, true);
        $roles = array_diff($roles, [self::ALLOW_PENDING]);

        if (!$request->user() || !in_array($request->user()->role, $roles)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $status = $request->user()->status;

        // 'inactive' reste bloqué partout, drapeau ou pas.
        if ($status === 'active' || ($allowPending && $status === 'pending')) {
            return $next($request);
        }

        return response()->json(['message' => 'Account is pending validation.'], 403);
    }
}
