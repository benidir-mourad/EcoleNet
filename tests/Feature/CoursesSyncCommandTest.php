<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Resource;
use App\Models\SchoolClass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class CoursesSyncCommandTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    private string $source;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // Arborescence minimale au format 'socle', sous un dossier 01_Cours
        // pour que le chemin de stockage soit calculé comme en production.
        $this->source = storage_path('framework/testing/01_Cours');
        File::deleteDirectory($this->source);

        $chapter = "{$this->source}/2eme/Decouverte/S1_Bienvenue_dans_le_code";
        File::makeDirectory("{$chapter}/C_Fiche_Eleve_PDF", 0777, true);
        File::makeDirectory("{$chapter}/A_Deroule_Prof_PDF", 0777, true);
        File::put("{$chapter}/C_Fiche_Eleve_PDF/S1_Fiche_Eleve.pdf", 'contenu initial');
        File::put("{$chapter}/A_Deroule_Prof_PDF/S1_Deroule_Prof.pdf", 'deroule initial');
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->source);
        parent::tearDown();
    }

    private function sync(array $options = []): void
    {
        $this->artisan('courses:sync', array_merge([
            '--source' => $this->source,
            '--class' => '2eme',
        ], $options))->assertSuccessful();
    }

    public function test_it_builds_the_class_hierarchy_and_imports_the_files(): void
    {
        $this->user('teacher', 'active', ['email' => 'teacher@ecolenet.be']);

        $this->sync();

        $class = SchoolClass::where('slug', '2e-annee')->first();
        $this->assertNotNull($class);

        $section = $class->sections()->where('name', 'Découverte')->first();
        $this->assertNotNull($section, 'le libellé accentué vient de la table LABELS');

        $course = Course::where('section_id', $section->id)->first();
        $this->assertSame('S1 - Bienvenue dans le code', $course->name);
        $this->assertFalse($course->is_archived, 'un cours rattaché ne part pas en bibliothèque');

        $this->assertSame(2, Resource::where('course_id', $course->id)->count());
    }

    public function test_the_teacher_run_sheet_is_imported_hidden(): void
    {
        $this->user('teacher', 'active', ['email' => 'teacher@ecolenet.be']);

        $this->sync();

        $this->assertFalse(Resource::where('file_name', 'S1_Deroule_Prof.pdf')->first()->is_visible);
        $this->assertTrue(Resource::where('file_name', 'S1_Fiche_Eleve.pdf')->first()->is_visible);
    }

    public function test_it_derives_a_title_from_the_file_name_on_creation(): void
    {
        $this->user('teacher', 'active', ['email' => 'teacher@ecolenet.be']);

        $this->sync();

        $this->assertSame(
            'S1 Fiche Eleve',
            Resource::where('file_name', 'S1_Fiche_Eleve.pdf')->first()->title
        );
    }

    public function test_structure_only_creates_no_resource(): void
    {
        $this->user('teacher', 'active', ['email' => 'teacher@ecolenet.be']);

        $this->sync(['--structure-only' => true]);

        $this->assertSame(1, Course::whereNotNull('section_id')->count());
        $this->assertSame(0, Resource::count());
    }

    public function test_an_unchanged_file_is_left_alone(): void
    {
        $this->user('teacher', 'active', ['email' => 'teacher@ecolenet.be']);

        $this->sync();
        $before = Resource::where('file_name', 'S1_Fiche_Eleve.pdf')->first();

        $this->sync();
        $after = Resource::where('file_name', 'S1_Fiche_Eleve.pdf')->first();

        $this->assertSame(2, Resource::count(), 'aucun doublon à la resynchro');
        $this->assertEquals($before->updated_at, $after->updated_at);
    }

    public function test_teacher_edits_survive_a_change_to_the_source_file(): void
    {
        $this->user('teacher', 'active', ['email' => 'teacher@ecolenet.be']);

        $this->sync();

        // Le professeur masque une ressource et la renomme depuis l'interface.
        $resource = Resource::where('file_name', 'S1_Fiche_Eleve.pdf')->first();
        $resource->update(['is_visible' => false, 'title' => 'À imprimer avant le cours']);

        // Puis il retouche le fichier dans OneDrive.
        File::put(
            "{$this->source}/2eme/Decouverte/S1_Bienvenue_dans_le_code/C_Fiche_Eleve_PDF/S1_Fiche_Eleve.pdf",
            'contenu revise'
        );

        $this->sync();

        $resource->refresh();
        $this->assertFalse($resource->is_visible, 'la visibilité est un choix du professeur');
        $this->assertSame('À imprimer avant le cours', $resource->title, 'le titre aussi');
        $this->assertSame(strlen('contenu revise'), $resource->file_size, 'le fichier a bien été remplacé');
    }
}
