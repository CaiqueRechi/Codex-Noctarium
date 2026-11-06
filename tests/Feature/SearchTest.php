<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Entities\UpdateEntityProperties;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\SearchDocument;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Infrastructure\Storage\StoredMarkdown;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use RuntimeException;

final class SearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_06_searches_authorized_content_and_metadata_with_filters(): void
    {
        [$sourceId, $targetId, $firstContextId, $secondContextId] = $this->createIndexedKnowledge();

        foreach (['JWT', 'Mapa', 'referência', 'segurança', 'classificação', 'confidencial', 'Primeiro Contexto', 'depends_on'] as $query) {
            $response = $this->getJson('/vault/search?'.http_build_query(['q' => $query]))
                ->assertOk();

            self::assertContains(
                $sourceId,
                collect($response->json('results'))->pluck('id')->all(),
                "The search query '{$query}' did not return the indexed source entity.",
            );
        }

        $this->getJson('/vault/search?'.http_build_query([
            'q' => 'Documento',
            'context_id' => $firstContextId,
            'entity_type' => 'referência',
            'tag' => 'segurança',
        ]))
            ->assertOk()
            ->assertJsonCount(1, 'results')
            ->assertJsonPath('results.0.id', $sourceId)
            ->assertJsonPath('results.0.contextId', $firstContextId);

        $this->getJson('/vault/search?'.http_build_query([
            'q' => 'Documento',
            'context_id' => $secondContextId,
            'tag' => 'segurança',
        ]))
            ->assertOk()
            ->assertJsonCount(0, 'results');

        self::assertNotSame($sourceId, $targetId);
    }

    public function test_rf_06_rejects_unknown_context_filters(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        $this->getJson('/vault/search?'.http_build_query([
            'q' => 'documento',
            'context_id' => '019a34a8-0c7e-71ec-88ca-c4fb55749999',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('context_id');
    }

    public function test_rf_06_reindex_command_dispatches_work_in_chunks(): void
    {
        $this->createIndexedKnowledge();
        Queue::fake();

        $this->artisan('cvc:reindex', ['--chunk' => 1])->assertSuccessful();

        Queue::assertPushed(IndexKnowledgeEntity::class, 2);
    }

    public function test_rf_06_refuses_to_index_a_tampered_markdown_revision(): void
    {
        [$sourceId] = $this->createIndexedKnowledge();
        MarkdownDocument::query()->whereKey($sourceId)->update([
            'content_hash' => str_repeat('0', 64),
        ]);

        $this->expectException(RuntimeException::class);
        (new IndexKnowledgeEntity($sourceId))->handle(
            $this->app->make(MarkdownStorage::class),
        );
    }

    public function test_rf_06_never_exposes_stale_or_soft_deleted_index_content(): void
    {
        [$sourceId] = $this->createIndexedKnowledge();
        $staleContent = 'segredo removido da revisão atual';
        SearchDocument::query()->whereKey($sourceId)->update([
            'content' => $staleContent,
            'content_hash' => hash('sha256', $staleContent),
        ]);

        $this->getJson('/vault/search?'.http_build_query(['q' => 'segredo removido']))
            ->assertOk()
            ->assertJsonCount(0, 'results');

        (new IndexKnowledgeEntity($sourceId))->handle(
            $this->app->make(MarkdownStorage::class),
        );
        KnowledgeEntity::query()->findOrFail($sourceId)->delete();

        $this->getJson('/vault/search?'.http_build_query(['q' => 'JWT']))
            ->assertOk()
            ->assertJsonCount(0, 'results');
    }

    public function test_rf_06_an_older_job_cannot_overwrite_a_newer_search_index(): void
    {
        [$sourceId] = $this->createIndexedKnowledge();
        $storage = $this->app->make(MarkdownStorage::class);
        $callbackExecuted = false;
        $interleavingStorage = new class($storage, function () use ($sourceId, &$callbackExecuted): void {
            $callbackExecuted = true;
            $opened = $this->app->make(SaveDocument::class)->handle(
                $sourceId,
                "# Documento atual\n\nConteúdo exclusivamente novo.\n",
                2,
            );
            $this->app->make(UpdateEntityProperties::class)->handle(
                $sourceId,
                'registro-atual',
                ['estado' => 'vigente'],
                ['atualizado'],
            );

            self::assertSame(3, $opened->revision);
        }) implements MarkdownStorage {

            private bool $hasIntercepted = false;

            public function __construct(
                private readonly MarkdownStorage $storage,
                private readonly \Closure $afterRead,
            ) {}

            public function writeRevision(
                string $vaultId,
                string $entityId,
                int $revision,
                string $content,
            ): StoredMarkdown {
                return $this->storage->writeRevision($vaultId, $entityId, $revision, $content);
            }

            public function read(string $vaultId, string $entityId, string $storagePath): string
            {
                $content = $this->storage->read($vaultId, $entityId, $storagePath);

                if (! $this->hasIntercepted) {
                    $this->hasIntercepted = true;
                    ($this->afterRead)();
                }

                return $content;
            }
        };

        (new IndexKnowledgeEntity($sourceId))->handle($interleavingStorage);

        self::assertTrue($callbackExecuted);
        $indexed = SearchDocument::query()->findOrFail($sourceId);
        self::assertStringContainsString('exclusivamente novo', $indexed->content);
        self::assertSame('registro-atual', $indexed->entity_type);
        self::assertSame(['atualizado'], $indexed->tags);
        self::assertStringContainsString('vigente', $indexed->properties);

        foreach (['JWT', 'referência', 'confidencial'] as $staleQuery) {
            $response = $this->getJson('/vault/search?'.http_build_query(['q' => $staleQuery]))
                ->assertOk();

            self::assertNotContains(
                $sourceId,
                collect($response->json('results'))->pluck('id')->all(),
            );
        }
        foreach (['exclusivamente novo', 'registro-atual', 'vigente', 'atualizado'] as $currentQuery) {
            $this->getJson('/vault/search?'.http_build_query(['q' => $currentQuery]))
                ->assertOk()
                ->assertJsonPath('results.0.id', $sourceId);
        }
    }

    /** @return array{string, string, string, string} */
    private function createIndexedKnowledge(): array
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $firstContext = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $secondContext = KnowledgeContext::query()->create([
            'vault_id' => $firstContext->vault_id,
            'parent_id' => $firstContext->parent_id,
            'kind' => KnowledgeContext::KIND_CONTEXT,
            'name' => 'Segundo Contexto',
            'sort_order' => 1,
        ]);
        $createDocument = $this->app->make(CreateDocument::class);
        $source = $createDocument->handle((string) $firstContext->getKey());
        $target = $createDocument->handle((string) $secondContext->getKey());
        $source = $this->app->make(SaveDocument::class)->handle(
            $source->id,
            "# Documento JWT\n\nAutenticação em camadas.\n",
            $source->revision,
        );
        $this->app->make(SaveDocument::class)->handle(
            $target->id,
            "# Documento auxiliar\n",
            $target->revision,
        );
        KnowledgeEntity::query()->whereKey($source->id)->update(['title' => 'Mapa de segurança']);
        KnowledgeEntity::query()->whereKey($target->id)->update(['title' => 'Chaves rotativas']);
        $this->app->make(UpdateEntityProperties::class)->handle(
            $source->id,
            'referência',
            ['classificação' => 'confidencial'],
            ['segurança', 'jwt'],
        );
        $this->app->make(CreateRelation::class)->handle(
            $source->id,
            $target->id,
            null,
            'depends_on',
            true,
            [],
        );

        return [
            $source->id,
            $target->id,
            (string) $firstContext->getKey(),
            (string) $secondContext->getKey(),
        ];
    }
}
