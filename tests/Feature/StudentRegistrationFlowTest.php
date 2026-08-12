<?php

namespace Tests\Feature;

use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class StudentRegistrationFlowTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_a_new_student_can_go_from_registration_to_course_access(): void
    {
        $teacher = $this->user('teacher');
        $class = SchoolClass::create(['name' => '4TTR', 'slug' => '4ttr', 'is_active' => true]);

        // 1. Inscription : le compte est créé en attente, avec un token.
        $registration = $this->postJson('/api/register', [
            'first_name' => 'Lea',
            'last_name' => 'Martin',
            'email' => 'lea@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $studentToken = $registration->json('token');
        $studentId = $registration->json('user.id');

        $this->assertSame('pending', $registration->json('user.status'));

        // 2. En attente, l'élève voit son tableau de bord et la liste des classes.
        $this->asToken($studentToken)
            ->getJson('/api/student/dashboard')
            ->assertOk()
            ->assertJsonPath('enrollment', null)
            ->assertJsonPath('pending_enrollment', null);

        $this->asToken($studentToken)
            ->getJson('/api/student/classes')
            ->assertOk()
            ->assertJsonPath('classes.0.id', $class->id);

        // 3. Il demande son inscription.
        $this->asToken($studentToken)
            ->postJson('/api/student/enroll', ['class_id' => $class->id])
            ->assertCreated();

        $this->asToken($studentToken)
            ->getJson('/api/student/dashboard')
            ->assertOk()
            ->assertJsonPath('pending_enrollment.school_class.id', $class->id);

        // 4. Le reste de l'espace élève lui reste fermé tant qu'il est en attente.
        $this->asToken($studentToken)
            ->getJson('/api/student/courses')
            ->assertForbidden();

        // 5. La demande apparaît au professeur, qui la valide.
        $teacherToken = $teacher->createToken('auth_token')->plainTextToken;

        $enrollmentId = $this->asToken($teacherToken)
            ->getJson('/api/teacher/enrollments/pending')
            ->assertOk()
            ->assertJsonPath('enrollments.0.student.id', $studentId)
            ->json('enrollments.0.id');

        $this->asToken($teacherToken)
            ->patchJson("/api/teacher/enrollments/{$enrollmentId}/approve")
            ->assertOk();

        // 6. L'approbation active le compte et ouvre l'espace élève.
        $this->assertSame('active', User::find($studentId)->status);

        $this->asToken($studentToken)
            ->getJson('/api/student/courses')
            ->assertOk();

        $this->asToken($studentToken)
            ->getJson('/api/student/dashboard')
            ->assertOk()
            ->assertJsonPath('enrollment.school_class.id', $class->id);
    }

    public function test_a_pending_student_cannot_enroll_twice(): void
    {
        $class = SchoolClass::create(['name' => '5TTR', 'slug' => '5ttr', 'is_active' => true]);

        $token = $this->postJson('/api/register', [
            'first_name' => 'Sam',
            'last_name' => 'Dubois',
            'email' => 'sam@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->json('token');

        $this->asToken($token)
            ->postJson('/api/student/enroll', ['class_id' => $class->id])
            ->assertCreated();

        $this->asToken($token)
            ->postJson('/api/student/enroll', ['class_id' => $class->id])
            ->assertStatus(422);
    }

    public function test_a_deactivated_student_stays_blocked_on_the_enrollment_routes(): void
    {
        $class = SchoolClass::create(['name' => '6TTR', 'slug' => '6ttr', 'is_active' => true]);
        $student = $this->user('student', 'inactive');
        $token = $student->createToken('auth_token')->plainTextToken;

        // Le drapeau allow-pending n'ouvre la porte qu'aux comptes 'pending'.
        $this->asToken($token)->getJson('/api/student/dashboard')->assertForbidden();
        $this->asToken($token)->getJson('/api/student/classes')->assertForbidden();
        $this->asToken($token)
            ->postJson('/api/student/enroll', ['class_id' => $class->id])
            ->assertForbidden();
    }

    /**
     * Le guard sanctum mémorise l'utilisateur résolu pour toute la durée du test :
     * sans ce reset, la requête suivante rejoue l'authentification de la précédente.
     */
    private function asToken(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', "Bearer {$token}");
    }
}
