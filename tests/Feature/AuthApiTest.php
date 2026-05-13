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

    public function test_invalid_credentials_are_rejected(): void
    {
        $teacher = $this->user('teacher', 'active', ['email' => 'teacher@example.com']);

        $this->postJson('/api/login', [
            'email' => $teacher->email,
            'password' => 'wrong-password',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid credentials.');
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
