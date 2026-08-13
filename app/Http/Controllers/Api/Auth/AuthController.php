<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name'  => 'required|string|max:100',
            'email'      => 'required|email|unique:users',
            'password'   => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'first_name' => $data['first_name'],
            'last_name'  => $data['last_name'],
            'email'      => $data['email'],
            'password'   => Hash::make($data['password']),
            'role'       => 'student',
            'status'     => 'pending',
        ]);

        // Auto-login: return a token so the student can immediately choose their class
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'    => $this->userResource($user),
            'token'   => $token,
            'message' => 'Registration received. Your account is pending validation.',
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        // Message unique : distinguer « email inconnu » de « mot de passe incorrect »
        // permettait de vérifier qu'une adresse possède un compte sur la plateforme.
        // Le hachage est calculé même sans utilisateur, pour que le temps de réponse
        // ne trahisse pas l'existence du compte.
        if (!$user || !Hash::check($data['password'], $user->password)) {
            if (!$user) {
                Hash::make($data['password']);
            }

            return response()->json(['message' => 'Email ou mot de passe incorrect.'], 401);
        }

        // 'pending' peut se connecter : le tableau de bord affiche l'état d'attente de validation.
        if ($user->status === 'inactive') {
            return response()->json(['message' => 'Votre compte a été désactivé. Veuillez contacter un administrateur.'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $this->userResource($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->userResource($request->user())]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        // 'avatar' n'est volontairement pas modifiable ici : le seul chemin légitime
        // est uploadAvatar(), qui valide le fichier. L'accepter en chaîne libre
        // laissait pointer l'image vers n'importe quel chemin.
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name'  => 'sometimes|string|max:100',
            'email'      => 'sometimes|email|unique:users,email,' . $user->id,
            'password'   => ['sometimes', 'confirmed', Password::min(8)],
        ]);

        $passwordChanged = isset($data['password']);

        if ($passwordChanged) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);

        // Changer son mot de passe doit fermer les autres sessions : sinon le geste
        // réflexe après une compromission ne déconnecte pas l'attaquant.
        if ($passwordChanged) {
            $current = $request->user()->currentAccessToken();
            $user->tokens()->when($current, fn ($q) => $q->where('id', '!=', $current->id))->delete();
        }

        return response()->json(['user' => $this->userResource($user->fresh())]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate(['avatar' => 'required|image|max:2048']);

        $user = $request->user();

        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json(['user' => $this->userResource($user->fresh())]);
    }

    private function userResource(User $user): array
    {
        return [
            'id'         => $user->id,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name,
            'full_name'  => $user->full_name,
            'email'      => $user->email,
            'role'       => $user->role,
            'status'     => $user->status,
            'avatar'     => $user->avatar,
            'created_at' => $user->created_at,
        ];
    }
}
