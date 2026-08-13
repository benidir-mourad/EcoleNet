<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_student_registration_creates_pending_account(): void
    {
        $this->postJson('/api/register', [
            'first_name' => 'Alice',
            'last_name' => 'Martin',
            'email' => 'alice@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertCreated()
            ->assertJsonPath('user.role', 'student')
            ->assertJsonPath('user.status', 'pending');

        $this->assertDatabaseHas('users', [
            'email' => 'alice@example.com',
            'role' => 'student',
            'status' => 'pending',
        ]);
    }

    public function test_active_user_can_login_and_read_profile(): void
    {
        $teacher = $this->user('teacher', 'active', ['email' => 'teacher@example.com']);

        $token = $this->postJson('/api/login', [
            'email' => $teacher->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'teacher')
            ->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'teacher@example.com');
    }

    /**
     * Le message ne doit pas trahir l'existence du compte : c'est ce qui permettait
     * d'énumérer les adresses inscrites. Les deux cas répondent à l'identique.
     */
    public function test_login_does_not_reveal_whether_the_account_exists(): void
    {
        $teacher = $this->user('teacher', 'active', ['email' => 'teacher@example.com']);
        $expected = 'Email ou mot de passe incorrect.';

        $this->postJson('/api/login', [
            'email' => $teacher->email,
            'password' => 'wrong-password',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('message', $expected);

        $this->postJson('/api/login', [
            'email' => 'inconnu@example.com',
            'password' => 'password',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('message', $expected);
    }

    public function test_forgot_password_does_not_reveal_whether_the_account_exists(): void
    {
        $this->user('student', 'active', ['email' => 'connu@example.com']);
        $expected = 'Si un compte existe pour cette adresse, un lien de réinitialisation vient d\'être envoyé.';

        $this->postJson('/api/forgot-password', ['email' => 'connu@example.com'])
            ->assertOk()
            ->assertJsonPath('message', $expected);

        $this->postJson('/api/forgot-password', ['email' => 'inconnu@example.com'])
            ->assertOk()
            ->assertJsonPath('message', $expected);
    }

    public function test_changing_the_password_closes_other_sessions(): void
    {
        $user = $this->user('student', 'active');
        $otherDevice = $user->createToken('autre_appareil')->plainTextToken;
        $current = $user->createToken('session_courante')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', "Bearer {$current}")
            ->putJson('/api/profile', [
                'password' => 'nouveau-mot-de-passe',
                'password_confirmation' => 'nouveau-mot-de-passe',
            ])
            ->assertOk();

        // La session qui a fait le changement survit, les autres tombent.
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', "Bearer {$otherDevice}")->getJson('/api/me')->assertUnauthorized();

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', "Bearer {$current}")->getJson('/api/me')->assertOk();
    }

    public function test_user_can_update_profile(): void
    {
        $student = $this->user('student');

        $this->actingAs($student, 'sanctum')
            ->putJson('/api/profile', [
                'first_name' => 'Nora',
                'email' => 'nora@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('user.first_name', 'Nora')
            ->assertJsonPath('user.email', 'nora@example.com');
    }
}
