<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class AdminUserApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_admin_can_create_filter_update_status_and_delete_user(): void
    {
        $admin = $this->user('admin');

        $createdId = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', [
                'first_name' => 'Paul',
                'last_name' => 'Teacher',
                'email' => 'paul@example.com',
                'password' => 'password123',
                'role' => 'teacher',
                'status' => 'active',
            ])
            ->assertCreated()
            ->assertJsonPath('user.email', 'paul@example.com')
            ->json('user.id');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?role=teacher&search=paul')
            ->assertOk()
            ->assertJsonPath('users.data.0.id', $createdId);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$createdId}/status", ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('user.status', 'inactive');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$createdId}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $createdId]);
    }

    public function test_deactivating_a_user_revokes_their_open_sessions(): void
    {
        // Authentification par token des deux côtés : actingAs() persisterait sur
        // toute la méthode et masquerait le header Bearer du dernier appel.
        $adminToken = $this->user('admin')->createToken('auth_token')->plainTextToken;
        $student = $this->user('student', 'active');
        $studentToken = $student->createToken('auth_token')->plainTextToken;

        $this->asToken($studentToken)->getJson('/api/me')->assertOk();

        $this->asToken($adminToken)
            ->patchJson("/api/admin/users/{$student->id}/status", ['status' => 'inactive'])
            ->assertOk();

        $this->asToken($studentToken)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_deactivating_a_user_through_the_update_endpoint_also_revokes_sessions(): void
    {
        $adminToken = $this->user('admin')->createToken('auth_token')->plainTextToken;
        $student = $this->user('student', 'active');
        $studentToken = $student->createToken('auth_token')->plainTextToken;

        $this->asToken($adminToken)
            ->putJson("/api/admin/users/{$student->id}", ['status' => 'inactive'])
            ->assertOk();

        $this->asToken($studentToken)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_reactivating_a_user_leaves_their_sessions_untouched(): void
    {
        $adminToken = $this->user('admin')->createToken('auth_token')->plainTextToken;
        $student = $this->user('student', 'pending');
        $studentToken = $student->createToken('auth_token')->plainTextToken;

        $this->asToken($adminToken)
            ->patchJson("/api/admin/users/{$student->id}/status", ['status' => 'active'])
            ->assertOk();

        $this->asToken($studentToken)->getJson('/api/me')->assertOk();
    }

    /**
     * Le guard sanctum mémorise l'utilisateur résolu pour toute la durée du test :
     * sans ce reset, la requête suivante réutilise l'authentification de la précédente
     * au lieu de rejouer le token passé en en-tête.
     */
    private function asToken(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', "Bearer {$token}");
    }

    public function test_non_admin_cannot_manage_users(): void
    {
        $teacher = $this->user('teacher');

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }
}
