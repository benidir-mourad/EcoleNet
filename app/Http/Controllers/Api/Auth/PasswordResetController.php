<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

class PasswordResetController extends Controller
{
    public function sendResetLink(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink($request->only('email'));

        return match ($status) {
            Password::RESET_LINK_SENT => response()->json([
                'message' => 'Un lien de réinitialisation a été envoyé à votre adresse email.',
            ]),
            Password::RESET_THROTTLED => response()->json([
                'message' => 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
            ], 429),
            default => response()->json([
                'message' => 'Aucun compte trouvé avec cette adresse email.',
            ], 422),
        };
    }

    public function reset(Request $request)
    {
        $request->validate([
            'token'    => 'required|string',
            'email'    => 'required|email',
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));
                $user->save();
                event(new PasswordReset($user));
            }
        );

        return match ($status) {
            Password::PASSWORD_RESET => response()->json([
                'message' => 'Votre mot de passe a été réinitialisé avec succès.',
            ]),
            Password::INVALID_TOKEN => response()->json([
                'message' => 'Le lien de réinitialisation est invalide ou a expiré.',
            ], 422),
            default => response()->json([
                'message' => 'Une erreur est survenue. Veuillez recommencer.',
            ], 422),
        };
    }
}
