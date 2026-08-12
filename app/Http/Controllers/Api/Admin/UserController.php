<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $q = $request->search;
            $query->where(fn($q2) => $q2->where('first_name', 'like', "%$q%")
                ->orWhere('last_name', 'like', "%$q%")
                ->orWhere('email', 'like', "%$q%"));
        }

        return response()->json(['users' => $query->latest()->paginate(20)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name'  => 'required|string|max:100',
            'email'      => 'required|email|unique:users',
            'password'   => ['required', Password::min(8)],
            'role'       => 'required|in:admin,teacher,student',
            'status'     => 'in:pending,active,inactive',
        ]);

        $data['password'] = Hash::make($data['password']);
        $data['status'] = $data['status'] ?? 'active';

        $user = User::create($data);

        return response()->json(['user' => $user], 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name'  => 'sometimes|string|max:100',
            'email'      => 'sometimes|email|unique:users,email,' . $user->id,
            'role'       => 'sometimes|in:admin,teacher,student',
            'status'     => 'sometimes|in:pending,active,inactive',
        ]);

        $user->update($data);
        $this->revokeTokensIfDeactivated($user);

        return response()->json(['user' => $user->fresh()]);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted.']);
    }

    public function updateStatus(Request $request, User $user)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,active,inactive',
        ]);

        $user->update($data);
        $this->revokeTokensIfDeactivated($user);

        return response()->json(['user' => $user->fresh()]);
    }

    /**
     * Un compte désactivé ne doit pas survivre dans les sessions déjà ouvertes :
     * le garde du login ne bloque que les nouvelles connexions.
     */
    private function revokeTokensIfDeactivated(User $user): void
    {
        if ($user->status === 'inactive') {
            $user->tokens()->delete();
        }
    }
}
