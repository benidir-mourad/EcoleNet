<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Resource;
use App\Models\Section;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class RateLimitAndIntegrityTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    /**
     * Sans limite, douze mauvais mots de passe d'affilée répondaient tous 401.
     * Ce test échouerait si le middleware disparaissait d'une route.
     */
    public function test_login_stops_answering_after_a_burst_of_failures(): void
    {
        $user = $this->user('teacher', 'active', ['email' => 'prof@example.com']);

        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'mauvais',
            ])->getStatusCode();
        }

        $this->assertContains(429, $codes, 'La force brute doit finir par être bloquée.');
        $this->assertSame(401, $codes[0], 'Les premières tentatives répondent normalement.');
    }

    public function test_password_reset_requests_are_rate_limited(): void
    {
        $codes = [];
        for ($i = 0; $i < 6; $i++) {
            $codes[] = $this->postJson('/api/forgot-password', [
                'email' => 'quelquun@example.com',
            ])->getStatusCode();
        }

        $this->assertContains(429, $codes);
    }

    /**
     * Les clés étrangères déclarées n'existaient pas en base : supprimer une section
     * laissait cours, chapitres et ressources derrière elle. Ce test vérifie que la
     * cascade fait son travail.
     */
    public function test_deleting_a_section_takes_its_courses_and_resources_with_it(): void
    {
        $teacher = $this->user('teacher');
        $class = $this->schoolClass(['teacher' => $teacher]);
        $section = Section::create([
            'class_id' => $class->id, 'name' => 'Informatique',
            'slug' => 'info-cascade', 'order' => 1, 'is_active' => true,
        ]);

        $course = $this->courseForTeacher($teacher, ['section' => $section]);
        $chapter = Chapter::create(['course_id' => $course->id, 'title' => 'Chapitre', 'order' => 1]);
        $resource = $this->resourceForCourse($course, ['chapter_id' => $chapter->id]);

        $this->actingAs($teacher, 'sanctum')
            ->deleteJson("/api/teacher/sections/{$section->id}")
            ->assertOk();

        $this->assertDatabaseMissing('sections', ['id' => $section->id]);
        $this->assertDatabaseMissing('courses', ['id' => $course->id]);
        $this->assertDatabaseMissing('chapters', ['id' => $chapter->id]);
        $this->assertDatabaseMissing('resources', ['id' => $resource->id]);
    }

    public function test_no_orphan_survives_the_deletion_of_a_course(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course);

        DB::table('courses')->where('id', $course->id)->delete();

        $this->assertSame(
            0,
            Resource::where('id', $resource->id)->count(),
            'La ressource doit disparaître avec son cours.'
        );
    }
}
