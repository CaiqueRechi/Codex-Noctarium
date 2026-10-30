<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Infrastructure\Storage\LocalMarkdownStorage;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Infrastructure\Storage\StoredMarkdown;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;

final class DocumentEditingTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_03_creates_and_reopens_an_exact_markdown_revision(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();

        $created = $this->postJson(route('cvc.documents.store'), [
            'context_id' => $context->getKey(),
        ])->assertCreated();
        $entityId = $created->json('document.id');

        self::assertIsString($entityId);
        self::assertTrue((bool) preg_match('/^[0-9a-f-]{36}$/', $entityId));
        self::assertNull($created->json('document.title'));
        self::assertSame('', $created->json('document.content'));
        self::assertSame(1, $created->json('document.revision'));

        $markdown = "# Primeira nota\n\nConteúdo preservado: áéíóú.\n";
        $this->patchJson(route('cvc.documents.update', ['entity' => $entityId]), [
            'content' => $markdown,
            'revision' => 1,
        ])->assertOk()
            ->assertJsonPath('document.id', $entityId)
            ->assertJsonPath('document.content', $markdown)
            ->assertJsonPath('document.revision', 2);

        $this->getJson(route('cvc.documents.show', ['entity' => $entityId]))
            ->assertOk()
            ->assertJsonPath('document.content', $markdown)
            ->assertJsonPath('document.revision', 2);
        $this->assertDatabaseHas('cvc_context_entity', [
            'context_id' => $context->getKey(),
            'entity_id' => $entityId,
        ]);
    }

    public function test_rf_03_rejects_a_stale_revision_without_overwriting_content(): void
    {
        [$entityId] = $this->createDocument();

        $this->patchJson(route('cvc.documents.update', ['entity' => $entityId]), [
            'content' => 'confirmed',
            'revision' => 1,
        ])->assertOk();

        $this->patchJson(route('cvc.documents.update', ['entity' => $entityId]), [
            'content' => 'stale overwrite',
            'revision' => 1,
        ])->assertConflict();

        $this->getJson(route('cvc.documents.show', ['entity' => $entityId]))
            ->assertOk()
            ->assertJsonPath('document.content', 'confirmed')
            ->assertJsonPath('document.revision', 2);
    }

    public function test_rf_03_write_failure_keeps_the_last_confirmed_revision(): void
    {
        [$entityId] = $this->createDocument();
        $this->app->instance(MarkdownStorage::class, new class implements MarkdownStorage
        {
            public function writeRevision(
                string $vaultId,
                string $entityId,
                int $revision,
                string $content,
            ): StoredMarkdown {
                throw new RuntimeException('Simulated private storage failure.');
            }

            public function read(string $vaultId, string $entityId, string $storagePath): string
            {
                throw new RuntimeException('Not used in this test.');
            }
        });

        $this->patchJson(route('cvc.documents.update', ['entity' => $entityId]), [
            'content' => 'pending content',
            'revision' => 1,
        ])->assertInternalServerError();

        $this->assertDatabaseHas('cvc_documents', [
            'entity_id' => $entityId,
            'revision' => 1,
            'content_hash' => hash('sha256', ''),
        ]);

        $this->app->instance(MarkdownStorage::class, new LocalMarkdownStorage);
        $this->getJson(route('cvc.documents.show', ['entity' => $entityId]))
            ->assertOk()
            ->assertJsonPath('document.content', '')
            ->assertJsonPath('document.revision', 1);
    }

    /** @return array{string, KnowledgeContext} */
    private function createDocument(): array
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $entityId = $this->postJson(route('cvc.documents.store'), [
            'context_id' => $context->getKey(),
        ])->assertCreated()->json('document.id');

        self::assertIsString($entityId);

        return [$entityId, $context];
    }
}
