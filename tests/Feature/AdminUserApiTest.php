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

    public function test_non_admin_cannot_manage_users(): void
    {
        $teacher = $this->user('teacher');

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }
}
