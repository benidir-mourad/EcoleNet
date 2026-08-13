<?php

namespace Tests\Support;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Resource;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

trait CreatesTestData
{
    protected function user(string $role = 'student', string $status = 'active', array $overrides = []): User
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

    /**
     * Une classe appartient à un enseignant. Sans propriétaire elle n'est gérable
     * par personne, ce qui ferait échouer tout contrôle d'appartenance.
     */
    protected function schoolClass(array $overrides = []): SchoolClass
    {
        $name = $overrides['name'] ?? uniqid('class_');
        $teacher = $overrides['teacher'] ?? null;
        unset($overrides['teacher']);

        return SchoolClass::create(array_merge([
            'name' => $name,
            'slug' => uniqid('class-'),
            'year' => '2025-2026',
            'is_active' => true,
            // Les tests créent l'enseignant avant la classe : on rattache à celui
            // déjà présent, sinon chaque classe naîtrait avec un propriétaire
            // différent de l'utilisateur qui agit.
            'teacher_id' => $teacher?->id
                ?? User::where('role', 'teacher')->orderBy('id')->value('id')
                ?? $this->user('teacher')->id,
        ], $overrides));
    }

    protected function section(?SchoolClass $class = null, array $overrides = []): Section
    {
        $class ??= $this->schoolClass();

        return Section::create(array_merge([
            'class_id' => $class->id,
            'name' => 'Informatique',
            'slug' => uniqid('section-'),
            'order' => 1,
            'is_active' => true,
        ], $overrides));
    }

    protected function courseForTeacher(?User $teacher = null, array $overrides = []): Course
    {
        $teacher ??= $this->user('teacher');
        $section = $overrides['section'] ?? $this->section();
        unset($overrides['section']);

        return Course::create(array_merge([
            'section_id' => $section->id,
            'teacher_id' => $teacher->id,
            'name' => 'Programmation',
            'slug' => uniqid('course-'),
            'order' => 1,
            'is_active' => true,
            'is_archived' => false,
        ], $overrides));
    }

    protected function resourceForCourse(Course $course, array $overrides = []): Resource
    {
        return Resource::create(array_merge([
            'course_id' => $course->id,
            'type' => 'presentation',
            'file_type' => 'pdf',
            'title' => 'Support de cours',
            'is_visible' => true,
            'order' => 1,
        ], $overrides));
    }

    protected function enroll(User $student, SchoolClass $class, string $status = 'approved'): Enrollment
    {
        return Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => $status,
            'approved_at' => $status === 'approved' ? now() : null,
        ]);
    }
}
