<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exercise;
use App\Models\Resource;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\StudentProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentDashboardNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_dashboard_returns_learning_insights(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $resource = Resource::create([
            'course_id' => $course->id,
            'type' => 'exercise',
            'file_type' => 'file_upload',
            'title' => 'Rendu PHP',
            'is_visible' => true,
            'order' => 1,
        ]);

        Exercise::create([
            'resource_id' => $resource->id,
            'title' => 'Rendu PHP',
            'type' => 'file_upload',
            'deadline' => now()->addDays(3),
            'max_score' => 20,
            'auto_correct' => false,
        ]);

        Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $course->section->class_id,
            'status' => 'approved',
        ]);

        StudentProgress::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'resource_id' => $resource->id,
            'is_viewed' => true,
            'viewed_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.courses', 1)
            ->assertJsonPath('stats.visible_resources', 1)
            ->assertJsonPath('stats.viewed_resources', 1)
            ->assertJsonPath('stats.pending_exercises', 1)
            ->assertJsonPath('upcoming_deadlines.0.title', 'Rendu PHP')
            ->assertJsonPath('recent_resources.0.title', 'Rendu PHP')
            ->assertJsonPath('progress_by_course.0.percent', 100);
    }

    public function test_approving_enrollment_creates_student_notification(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student', 'pending');
        $class = SchoolClass::create(['name' => '4TTI', 'slug' => '4tti', 'is_active' => true]);
        $enrollment = Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'pending',
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/enrollments/{$enrollment->id}/approve")
            ->assertOk();

        $this->actingAs($student->fresh(), 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.type', 'enrollment_approved');
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

    private function courseForTeacher(User $teacher): Course
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
            'name' => 'Programmation',
            'slug' => uniqid('course-'),
            'order' => 1,
            'is_active' => true,
            'is_archived' => false,
        ]);
    }
}
