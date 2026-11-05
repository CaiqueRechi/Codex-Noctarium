<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Application\Relations\DeleteRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class TrashTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_11_soft_deletes_and_restores_an_entity_with_valid_relations(): void
    {
        [$sourceId, $targetId, $relationId] = $this->createRelatedDocuments();

        $this->deleteJson("/vault/entities/{$sourceId}")
            ->assertOk()
            ->assertJsonPath('trashItem.id', $sourceId)
            ->assertJsonPath('deletedRelationIds.0', $relationId);

        self::assertTrue(KnowledgeEntity::withTrashed()->findOrFail($sourceId)->trashed());
        self::assertTrue(MarkdownDocument::withTrashed()->findOrFail($sourceId)->trashed());
        $trashedRelation = KnowledgeRelation::withTrashed()->findOrFail($relationId);
        self::assertTrue($trashedRelation->trashed());
        self::assertSame($sourceId, $trashedRelation->cascade_deleted_by_entity_id);
        self::assertFalse(KnowledgeEntity::query()->whereKey($sourceId)->exists());

        $this->getJson('/vault/search?'.http_build_query(['q' => 'conteúdo recuperável']))
            ->assertOk()
            ->assertJsonCount(0, 'results');

        $this->postJson("/vault/trash/{$sourceId}/restore")
            ->assertOk()
            ->assertJsonPath('entity.id', $sourceId)
            ->assertJsonPath('restoredRelations.0.id', $relationId)
            ->assertJsonCount(0, 'brokenRelations');

        self::assertFalse(KnowledgeEntity::query()->findOrFail($sourceId)->trashed());
        self::assertFalse(MarkdownDocument::query()->findOrFail($sourceId)->trashed());
        $restoredRelation = KnowledgeRelation::query()->findOrFail($relationId);
        self::assertNull($restoredRelation->cascade_deleted_by_entity_id);
        self::assertSame($targetId, $restoredRelation->target_entity_id);
        $this->getJson('/vault/search?'.http_build_query(['q' => 'conteúdo recuperável']))
            ->assertOk()
            ->assertJsonPath('results.0.id', $sourceId);
    }

    public function test_rf_11_reports_broken_relations_until_every_endpoint_is_restored(): void
    {
        [$sourceId, $targetId, $relationId] = $this->createRelatedDocuments();

        $this->deleteJson("/vault/entities/{$sourceId}")->assertOk();
        $this->deleteJson("/vault/entities/{$targetId}")->assertOk();

        $this->postJson("/vault/trash/{$sourceId}/restore")
            ->assertOk()
            ->assertJsonCount(0, 'restoredRelations')
            ->assertJsonPath('brokenRelations.0.id', $relationId)
            ->assertJsonPath('brokenRelations.0.missingEntityIds.0', $targetId);
        self::assertTrue(KnowledgeRelation::withTrashed()->findOrFail($relationId)->trashed());

        $this->postJson("/vault/trash/{$targetId}/restore")
            ->assertOk()
            ->assertJsonPath('restoredRelations.0.id', $relationId)
            ->assertJsonCount(0, 'brokenRelations');
        self::assertNotNull(KnowledgeRelation::query()->find($relationId));
    }

    public function test_rf_11_does_not_restore_a_relation_deleted_manually(): void
    {
        [$sourceId, , $relationId] = $this->createRelatedDocuments();
        $this->app->make(DeleteRelation::class)->handle($relationId);

        $this->deleteJson("/vault/entities/{$sourceId}")->assertOk();
        $this->postJson("/vault/trash/{$sourceId}/restore")
            ->assertOk()
            ->assertJsonCount(0, 'restoredRelations')
            ->assertJsonCount(0, 'brokenRelations');

        $relation = KnowledgeRelation::withTrashed()->findOrFail($relationId);
        self::assertTrue($relation->trashed());
        self::assertNull($relation->cascade_deleted_by_entity_id);
    }

    /** @return array{string, string, string} */
    private function createRelatedDocuments(): array
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $createDocument = $this->app->make(CreateDocument::class);
        $source = $createDocument->handle((string) $context->getKey());
        $target = $createDocument->handle((string) $context->getKey());
        $this->app->make(SaveDocument::class)->handle(
            $source->id,
            "# Registro\n\nConteúdo recuperável.\n",
            $source->revision,
        );
        $relation = $this->app->make(CreateRelation::class)->handle(
            $source->id,
            $target->id,
            null,
            'depends_on',
            true,
            [],
        );

        return [$source->id, $target->id, (string) $relation->getKey()];
    }
}
