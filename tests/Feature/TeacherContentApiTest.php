<?php

namespace Tests\Feature;

use App\Models\Chapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class TeacherContentApiTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_teacher_can_create_class_section_course_chapter_and_resource(): void
    {
        $teacher = $this->user('teacher');

        $classId = $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/teacher/classes', ['name' => '5TTI', 'year' => '2026-2027'])
            ->assertCreated()
            ->assertJsonPath('class.name', '5TTI')
            ->json('class.id');

        $sectionId = $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/classes/{$classId}/sections", ['name' => 'Algorithmique'])
            ->assertCreated()
            ->assertJsonPath('section.name', 'Algorithmique')
            ->json('section.id');

        $courseId = $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/sections/{$sectionId}/courses", [
                'name' => 'Structures de données',
                'description' => 'Listes, piles et files',
            ])
            ->assertCreated()
            ->assertJsonPath('course.teacher_id', $teacher->id)
            ->json('course.id');

        $chapterId = $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/courses/{$courseId}/chapters", ['title' => 'Les tableaux'])
            ->assertCreated()
            ->assertJsonPath('chapter.title', 'Les tableaux')
            ->json('chapter.id');

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/chapters/{$chapterId}/resources", [
                'type' => 'presentation',
                'title' => 'Slides chapitre 1',
            ])
            ->assertCreated()
            ->assertJsonPath('resource.title', 'Slides chapitre 1')
            ->assertJsonPath('resource.is_visible', false);
    }

    public function test_teacher_can_toggle_resource_visibility_and_student_only_sees_visible_resources(): void
    {
        $teacher = $this->user('teacher');
        $student = $this->user('student');
        $course = $this->courseForTeacher($teacher);
        $resource = $this->resourceForCourse($course, ['is_visible' => false]);
        $this->enroll($student, $course->section->schoolClass);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/resources/{$resource->id}")
            ->assertForbidden();

        $this->actingAs($teacher, 'sanctum')
            ->patchJson("/api/teacher/resources/{$resource->id}/visibility")
            ->assertOk()
            ->assertJsonPath('resource.is_visible', true);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/resources/{$resource->id}")
            ->assertOk()
            ->assertJsonPath('resource.id', $resource->id);
    }

    public function test_teacher_can_archive_course_and_assign_library_copy(): void
    {
        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $chapter = Chapter::create(['course_id' => $course->id, 'title' => 'Base', 'order' => 1]);
        $this->resourceForCourse($course, ['chapter_id' => $chapter->id, 'title' => 'Support']);
        $targetSection = $this->section();

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/courses/{$course->id}/archive")
            ->assertOk();

        $this->assertTrue($course->fresh()->is_archived);

        $this->actingAs($teacher, 'sanctum')
            ->postJson("/api/teacher/library/{$course->id}/assign", ['section_id' => $targetSection->id])
            ->assertCreated()
            ->assertJsonPath('course.section_id', $targetSection->id)
            ->assertJsonCount(1, 'course.chapters');
    }

    public function test_teacher_can_update_delete_chapter_and_upload_resource_file(): void
    {
        Storage::fake('public');

        $teacher = $this->user('teacher');
        $course = $this->courseForTeacher($teacher);
        $chapter = Chapter::create(['course_id' => $course->id, 'title' => 'Ancien titre', 'order' => 1]);
        $resource = $this->resourceForCourse($course, ['chapter_id' => $chapter->id, 'file_type' => null]);

        $this->actingAs($teacher, 'sanctum')
            ->putJson("/api/teacher/chapters/{$chapter->id}", ['title' => 'Nouveau titre'])
            ->assertOk()
            ->assertJsonPath('chapter.title', 'Nouveau titre');

        $this->actingAs($teacher, 'sanctum')
            ->post("/api/teacher/resources/{$resource->id}/file", [
                'file' => UploadedFile::fake()->create('support.pdf', 100, 'application/pdf'),
            ])
            ->assertOk()
            ->assertJsonPath('resource.file_type', 'pdf')
            ->assertJsonPath('resource.file_name', 'support.pdf');

        Storage::disk('public')->assertExists($resource->fresh()->file_path);

        $this->actingAs($teacher, 'sanctum')
            ->deleteJson("/api/teacher/chapters/{$chapter->id}")
            ->assertOk();

        $this->assertDatabaseMissing('chapters', ['id' => $chapter->id]);
    }
}
