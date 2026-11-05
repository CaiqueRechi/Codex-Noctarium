<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\OpenDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Perspectives\UpdatePerspective;
use CrowVaultCanvas\Application\Perspectives\UpdatePerspectiveLayout;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Application\Relations\DeleteRelation;
use CrowVaultCanvas\Application\Versions\CreateVaultVersion;
use CrowVaultCanvas\Application\Versions\RestoreVaultVersion;
use CrowVaultCanvas\Application\Versions\SnapshotCodec;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Domain\Knowledge\Models\VaultVersion;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use UnexpectedValueException;

final class VersioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_10_restores_a_complete_version_and_preserves_the_replaced_state(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $perspective = Perspective::query()->firstOrFail();
        $createDocument = $this->app->make(CreateDocument::class);
        $source = $createDocument->handle((string) $context->getKey());
        $target = $createDocument->handle((string) $context->getKey());
        $this->app->make(SaveDocument::class)->handle($source->id, '# versão um', 1);
        $relation = $this->app->make(CreateRelation::class)->handle(
            $source->id,
            $target->id,
            (string) $context->getKey(),
            'depends_on',
            true,
            [],
        );
        $this->app->make(UpdatePerspective::class)->handle(
            (string) $perspective->getKey(),
            'Arquitetura v1',
            [
                'context_ids' => [$context->getKey()],
                'entity_types' => [],
            ],
        );
        $this->app->make(UpdatePerspectiveLayout::class)->handle(
            (string) $perspective->getKey(),
            (string) $context->getKey(),
            $source->id,
            120.5,
            80.25,
            true,
        );
        $version = $this->app->make(CreateVaultVersion::class)->handle(
            (string) $perspective->getKey(),
            'Arquitetura v1',
            '42',
        );

        $this->app->make(SaveDocument::class)->handle($source->id, '# versão dois', 2);
        $extra = $createDocument->handle((string) $context->getKey());
        $this->app->make(DeleteRelation::class)->handle((string) $relation->getKey());
        $this->app->make(UpdatePerspective::class)->handle(
            (string) $perspective->getKey(),
            'Arquitetura atual',
            [
                'context_ids' => [],
                'entity_types' => ['referência'],
            ],
        );
        $this->app->make(UpdatePerspectiveLayout::class)->handle(
            (string) $perspective->getKey(),
            (string) $context->getKey(),
            $source->id,
            -30,
            410,
            false,
        );

        $restoration = $this->app->make(RestoreVaultVersion::class)->handle(
            (string) $version->getKey(),
            '42',
        );
        $restoredDocument = $this->app->make(OpenDocument::class)->handle($source->id);
        $perspective->refresh()->load('layouts');

        self::assertSame('# versão um', $restoredDocument->content);
        self::assertSame(2, $restoredDocument->revision);
        self::assertSame('Arquitetura v1', $perspective->name);
        self::assertSame([$context->getKey()], $perspective->filters['context_ids']);
        self::assertSame(120.5, $perspective->layouts->firstWhere('entity_id', $source->id)?->position_x);
        self::assertTrue((bool) $perspective->layouts->firstWhere('entity_id', $source->id)?->is_pinned);
        self::assertNotNull(KnowledgeRelation::query()->find($relation->getKey()));
        self::assertSoftDeleted('cvc_entities', ['id' => $extra->id]);
        self::assertSame(VaultVersion::KIND_RECOVERY, $restoration->recoveryVersion->kind);
        $this->getJson('/vault/search?'.http_build_query(['q' => 'versão um']))
            ->assertOk()
            ->assertJsonPath('results.0.id', $source->id);

        $this->app->make(RestoreVaultVersion::class)->handle(
            (string) $restoration->recoveryVersion->getKey(),
            '42',
        );
        $recoveredDocument = $this->app->make(OpenDocument::class)->handle($source->id);

        self::assertSame('# versão dois', $recoveredDocument->content);
        self::assertSame(3, $recoveredDocument->revision);
        self::assertNotNull(KnowledgeEntity::query()->find($extra->id));
        self::assertNull(KnowledgeRelation::query()->find($relation->getKey()));
        self::assertNotNull(KnowledgeRelation::withTrashed()->find($relation->getKey()));
        $this->getJson('/vault/search?'.http_build_query(['q' => 'versão dois']))
            ->assertOk()
            ->assertJsonPath('results.0.id', $source->id);
        $this->assertDatabaseCount('cvc_versions', 3);
    }

    public function test_rf_10_rejects_a_tampered_snapshot_before_changing_state(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $perspective = Perspective::query()->firstOrFail();
        $document = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $version = $this->app->make(CreateVaultVersion::class)->handle(
            (string) $perspective->getKey(),
            'Antes da adulteração',
            '42',
        );
        $snapshot = $version->snapshot;
        $snapshot['perspective']['name'] = 'Adulterada';
        $version->update(['snapshot' => $snapshot]);

        $this->expectException(UnexpectedValueException::class);

        try {
            $this->app->make(RestoreVaultVersion::class)->handle(
                (string) $version->getKey(),
                '42',
            );
        } finally {
            self::assertSame('Principal', $perspective->fresh()?->name);
            self::assertNotNull(KnowledgeEntity::query()->find($document->id));
            $this->assertDatabaseCount('cvc_versions', 1);
        }
    }

    public function test_rf_10_restores_a_snapshot_created_before_tags_existed(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $perspective = Perspective::query()->firstOrFail();
        $document = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $version = $this->app->make(CreateVaultVersion::class)->handle(
            (string) $perspective->getKey(),
            'Antes das tags',
            '42',
        );
        $snapshot = $version->snapshot;
        unset($snapshot['entities'][0]['tags']);
        $version->update([
            'snapshot' => $snapshot,
            'snapshot_hash' => $this->app->make(SnapshotCodec::class)->hash($snapshot),
        ]);
        KnowledgeEntity::query()->whereKey($document->id)->update(['tags' => ['temporária']]);

        $this->app->make(RestoreVaultVersion::class)->handle(
            (string) $version->getKey(),
            '42',
        );

        self::assertSame([], KnowledgeEntity::query()->findOrFail($document->id)->tags);
    }
}
