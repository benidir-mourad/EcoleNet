<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Enrollment;
use App\Models\Resource;
use App\Services\ActivityLogger;
use App\Services\GradeExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class GradeExportAndAuditTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    /* ── F3 : export des notes ─────────────────────────────────────────── */

    public function test_the_export_is_a_readable_workbook_listing_the_students(): void
    {
        $teacher = $this->user('teacher');
        $class = $this->schoolClass(['teacher' => $teacher, 'name' => '3TTI']);
        $section = $this->section($class);
        $this->courseForTeacher($teacher, ['section' => $section]);

        $student = $this->user('student', 'active', ['first_name' => 'Léa', 'last_name' => 'Martin']);
        $this->enroll($student, $class);

        $binary = app(GradeExporter::class)->toString($class->fresh());

        $this->assertStringStartsWith('PK', $binary, 'Un .xlsx est une archive ZIP.');

        $path = tempnam(sys_get_temp_dir(), 'export') . '.xlsx';
        file_put_contents($path, $binary);
        $sheet = IOFactory::load($path)->getActiveSheet();

        $this->assertSame('Élève', $sheet->getCell('A1')->getValue());
        $this->assertSame('Léa Martin', $sheet->getCell('A3')->getValue());
        $this->assertSame($student->email, $sheet->getCell('B3')->getValue());

        unlink($path);
    }

    public function test_the_export_is_refused_on_another_teachers_class(): void
    {
        $owner = $this->user('teacher');
        $intruder = $this->user('teacher');
        $class = $this->schoolClass(['teacher' => $owner]);

        $this->actingAs($intruder, 'sanctum')
            ->get("/api/teacher/classes/{$class->id}/grades.xlsx")
            ->assertForbidden();
    }

    /* ── F4 : journal d'audit ──────────────────────────────────────────── */

    public function test_approving_an_enrollment_is_recorded(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student', 'pending');
        $class = $this->schoolClass(['teacher' => $teacher]);
        $enrollment = $this->enroll($student, $class, 'pending');

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/enrollments/{$enrollment->id}/approve")
            ->assertOk();

        $entry = ActivityLog::where('action', ActivityLogger::ENROLLMENT_APPROVED)->first();

        $this->assertNotNull($entry, 'La validation doit laisser une trace.');
        $this->assertSame($teacher->id, $entry->actor_id);
        $this->assertSame($teacher->full_name, $entry->actor_label);
        $this->assertSame($enrollment->id, $entry->subject_id);
    }

    public function test_changing_a_user_status_is_recorded_with_both_values(): void
    {
        $admin = $this->user('admin');
        $student = $this->user('student', 'active');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$student->id}/status", ['status' => 'inactive'])
            ->assertOk();

        $entry = ActivityLog::where('action', ActivityLogger::USER_STATUS_CHANGED)->first();

        $this->assertNotNull($entry);
        $this->assertSame('active', $entry->context['from']);
        $this->assertSame('inactive', $entry->context['to']);
    }

    public function test_the_log_is_readable_by_an_admin_only(): void
    {
        $admin = $this->user('admin');
        $teacher = $this->user('teacher');

        app(ActivityLogger::class)->record(ActivityLogger::SYNC_RUN, 'Import manuel.', null, [], $admin);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/activity-log')
            ->assertOk()
            ->assertJsonPath('entries.data.0.summary', 'Import manuel.');

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/admin/activity-log')
            ->assertForbidden();
    }

    /* ── F5 : fenêtre de disponibilité ─────────────────────────────────── */

    public function test_a_resource_outside_its_window_is_refused_to_the_student(): void
    {
        $teacher = $this->user('teacher');
        $class = $this->schoolClass(['teacher' => $teacher]);
        $section = $this->section($class);
        $course = $this->courseForTeacher($teacher, ['section' => $section]);

        $student = $this->user('student');
        $this->enroll($student, $class);

        $resource = $this->resourceForCourse($course, ['is_visible' => true]);

        // Avant l'ouverture.
        $resource->update(['available_from' => now()->addDay(), 'available_until' => null]);
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/resources/{$resource->id}")
            ->assertForbidden();

        // Après la fermeture.
        $resource->update(['available_from' => now()->subWeek(), 'available_until' => now()->subHour()]);
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/resources/{$resource->id}")
            ->assertForbidden();

        // Pendant la fenêtre.
        $resource->update(['available_from' => now()->subHour(), 'available_until' => now()->addDay()]);
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/resources/{$resource->id}")
            ->assertOk();
    }

    public function test_a_resource_without_a_window_stays_open(): void
    {
        $resource = new Resource(['available_from' => null, 'available_until' => null]);

        $this->assertTrue($resource->isWithinAvailabilityWindow());
        $this->assertNull($resource->availabilityMessage());
    }

    public function test_the_closing_date_must_follow_the_opening_one(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course);

        $this->actingAs($teacher, 'sanctum')
            ->putJson("/api/teacher/resources/{$resource->id}", [
                'available_from'  => now()->addWeek()->toDateTimeString(),
                'available_until' => now()->addDay()->toDateTimeString(),
            ])
            ->assertStatus(422);
    }
}
