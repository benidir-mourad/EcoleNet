<?php

namespace Tests\Feature;

use App\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

/**
 * Les fichiers pédagogiques étaient servis statiquement depuis le disque public :
 * corrigés d'évaluation et ressources masquées étaient téléchargeables sans le
 * moindre jeton. Rien ne le détectait, faute de test sur cette frontière.
 */
class FileAccessTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    private function resourceWithFile(array $overrides = []): Resource
    {
        Storage::fake('local');

        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course, $overrides);

        Storage::disk('local')->put('resources/secret.pdf', 'contenu confidentiel');
        $resource->update(['file_path' => 'resources/secret.pdf', 'file_name' => 'secret.pdf']);

        return $resource->fresh();
    }

    public function test_a_signed_url_serves_the_file(): void
    {
        $resource = $this->resourceWithFile();

        $this->get($resource->file_url)
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_the_route_refuses_an_unsigned_request(): void
    {
        $resource = $this->resourceWithFile();

        $this->getJson("/api/files/resources/{$resource->id}")->assertForbidden();
    }

    public function test_the_route_refuses_a_tampered_signature(): void
    {
        $resource = $this->resourceWithFile();

        $url = $resource->file_url;
        $tampered = substr($url, 0, -1) . (str_ends_with($url, '0') ? '1' : '0');

        $this->get($tampered)->assertForbidden();
    }

    public function test_the_route_refuses_an_expired_signature(): void
    {
        $resource = $this->resourceWithFile();

        $expired = URL::temporarySignedRoute(
            'files.resource',
            now()->subMinute(),
            ['resource' => $resource->id]
        );

        $this->get($expired)->assertForbidden();
    }

    public function test_a_hidden_resource_never_exposes_its_storage_path(): void
    {
        $resource = $this->resourceWithFile(['is_visible' => false]);

        // file_path ne doit pas être devinable depuis la réponse de l'API : c'est
        // ce qui rendait les chemins de la synchro exploitables.
        $payload = $resource->toArray();

        $this->assertArrayHasKey('file_url', $payload);
        $this->assertArrayNotHasKey('source_path', $payload);
        $this->assertStringContainsString('/api/files/resources/', $payload['file_url']);
    }

    public function test_a_missing_file_answers_not_found_rather_than_erroring(): void
    {
        Storage::fake('local');

        $course = $this->courseForTeacher($this->user('teacher'));
        $resource = $this->resourceForCourse($course);
        $resource->update(['file_path' => 'resources/disparu.pdf']);

        $this->get($resource->fresh()->file_url)->assertNotFound();
    }
}
