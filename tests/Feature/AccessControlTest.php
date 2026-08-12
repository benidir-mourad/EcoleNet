<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Resource;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_student_cannot_access_student_routes(): void
    {
        $student = $this->user('student', 'pending');

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/dashboard')
            ->assertForbidden()
            ->assertJson(['message' => 'Account is pending validation.']);
    }

    public function test_pending_user_can_login_but_stays_blocked_from_student_routes(): void
    {
        $student = $this->user('student', 'pending', ['email' => 'pending@example.com']);

        $token = $this->postJson('/api/login', [
            'email' => $student->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/student/dashboard')
            ->assertForbidden()
            ->assertJson(['message' => 'Account is pending validation.']);
    }

    public function test_student_cannot_read_course_from_another_class(): void
    {
        $student = $this->user('student');
        $ownClass = SchoolClass::create(['name' => '3TTI', 'slug' => '3tti']);
        $otherCourse = $this->courseForTeacher($this->user('teacher'), 'Other Course');

        Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $ownClass->id,
            'status' => 'approved',
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/courses/{$otherCourse->id}")
            ->assertForbidden();
    }

    public function test_student_can_read_visible_resource_from_approved_class(): void
    {
        $student = $this->user('student');
        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = Resource::create([
            'course_id' => $course->id,
            'type' => 'presentation',
            'file_type' => 'pdf',
            'title' => 'Visible resource',
            'is_visible' => true,
        ]);

        Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $course->section->class_id,
            'status' => 'approved',
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/resources/{$resource->id}")
            ->assertOk()
            ->assertJsonPath('resource.id', $resource->id);
    }

    public function test_teacher_cannot_update_another_teachers_course(): void
    {
        $owner = $this->user('teacher');
        $otherTeacher = $this->user('teacher');
        $course = $this->courseForTeacher($owner);

        $this->actingAs($otherTeacher, 'sanctum')
            ->putJson("/api/teacher/courses/{$course->id}", ['name' => 'Stolen'])
            ->assertForbidden();

        $this->assertSame($course->name, $course->fresh()->name);
    }

    public function test_admin_can_update_any_teacher_course(): void
    {
        $admin = $this->user('admin');
        $course = $this->courseForTeacher($this->user('teacher'));

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/teacher/courses/{$course->id}", ['name' => 'Updated by admin'])
            ->assertOk()
            ->assertJsonPath('course.name', 'Updated by admin');
    }

    private function user(string $role, string $status = 'active', array $overrides = []): User
    {
        return User::create(array_merge([
            'first_name' => ucfirst($role),
            'last_name' => 'User',
            'email' => uniqid($role . '_') . '@example.com',
            'password' => Hash::make('password'),
            'role' => $role,
            'status' => $status,
        ], $overrides));
    }

    private function courseForTeacher(User $teacher, string $name = 'Course'): Course
    {
        $class = SchoolClass::create([
            'name' => uniqid('class_'),
            'slug' => uniqid('class-'),
            'is_active' => true,
        ]);

        $section = Section::create([
            'class_id' => $class->id,
            'name' => 'Informatique',
            'slug' => uniqid('section-'),
            'order' => 1,
            'is_active' => true,
        ]);

        return Course::create([
            'section_id' => $section->id,
            'teacher_id' => $teacher->id,
            'name' => $name,
            'slug' => uniqid('course-'),
            'order' => 1,
            'is_active' => true,
            'is_archived' => false,
        ]);
    }
}
