<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Trash\DeleteEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\Attachment;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

final class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_12_stores_and_serves_a_verified_image_privately(): void
    {
        $entityId = $this->createDocument();
        $content = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            true,
        );
        self::assertIsString($content);

        $attachmentId = $this->post('/vault/entities/'.$entityId.'/attachments', [
            'file' => UploadedFile::fake()->createWithContent('pixel.png', $content),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('attachment.name', 'pixel.png')
            ->assertJsonPath('attachment.mimeType', 'image/png')
            ->json('attachment.id');
        $attachment = Attachment::query()->findOrFail($attachmentId);
        $absolutePath = rtrim((string) config('crow-vault-canvas.storage.root'), '\\/')
            .DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $attachment->storage_path);

        self::assertFileExists($absolutePath);
        self::assertStringNotContainsString('public', $attachment->storage_path);
        self::assertSame(hash('sha256', $content), $attachment->content_hash);

        $download = $this->get("/vault/attachments/{$attachmentId}")
            ->assertOk()
            ->assertHeader('content-type', 'image/png')
            ->assertHeader('x-content-type-options', 'nosniff');
        self::assertStringContainsString('private', (string) $download->headers->get('cache-control'));
        self::assertStringContainsString('no-store', (string) $download->headers->get('cache-control'));
        self::assertStringContainsString('attachment;', (string) $download->headers->get('content-disposition'));
        self::assertSame($content, $download->streamedContent());
    }

    public function test_rf_12_rejects_disguised_unknown_and_oversized_files(): void
    {
        $entityId = $this->createDocument();
        $pdf = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";

        $this->post('/vault/entities/'.$entityId.'/attachments', [
            'file' => UploadedFile::fake()->createWithContent('disfarçado.png', $pdf),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
        $this->post('/vault/entities/'.$entityId.'/attachments', [
            'file' => UploadedFile::fake()->createWithContent('script.exe', 'MZ executable'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
        $this->post('/vault/entities/'.$entityId.'/attachments', [
            'file' => UploadedFile::fake()->create('grande.pdf', 5121, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('cvc_attachments', 0);
    }

    public function test_rf_12_rejects_duplicate_content_for_the_same_entity(): void
    {
        $entityId = $this->createDocument();
        $pdf = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";

        $this->post('/vault/entities/'.$entityId.'/attachments', [
            'file' => UploadedFile::fake()->createWithContent('primeiro.pdf', $pdf),
        ], ['Accept' => 'application/json'])->assertCreated();
        $this->post('/vault/entities/'.$entityId.'/attachments', [
            'file' => UploadedFile::fake()->createWithContent('duplicado.pdf', $pdf),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('cvc_attachments', 1);
    }

    public function test_rf_12_hides_an_attachment_while_its_entity_is_trashed(): void
    {
        $entityId = $this->createDocument();
        $pdf = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";
        $attachmentId = $this->post('/vault/entities/'.$entityId.'/attachments', [
            'file' => UploadedFile::fake()->createWithContent('registro.pdf', $pdf),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('attachment.id');

        $this->app->make(DeleteEntity::class)->handle($entityId);

        $this->get("/vault/attachments/{$attachmentId}")->assertNotFound();
        $this->assertDatabaseHas('cvc_attachments', [
            'id' => $attachmentId,
            'deleted_at' => null,
        ]);
    }

    private function createDocument(): string
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();

        return $this->app->make(CreateDocument::class)
            ->handle((string) $context->getKey())
            ->id;
    }
}
