<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\AttachEntityToContext;
use CrowVaultCanvas\Application\Contexts\UpdateEntityLayout;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Application\Relations\DeleteRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class RelationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_08_reuses_entities_with_independent_context_layouts_and_relations(): void
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
        $target = $createDocument->handle((string) $firstContext->getKey());

        $this->app->make(AttachEntityToContext::class)->handle(
            (string) $secondContext->getKey(),
            $source->id,
        );
        $updateLayout = $this->app->make(UpdateEntityLayout::class);
        $updateLayout->handle((string) $firstContext->getKey(), $source->id, 120.5, 80.25, true);
        $updateLayout->handle((string) $secondContext->getKey(), $source->id, -30.0, 410.0, false);
        $relation = $this->app->make(CreateRelation::class)->handle(
            $source->id,
            $target->id,
            (string) $firstContext->getKey(),
            'depends_on',
            true,
            [],
        );

        $this->assertDatabaseHas('cvc_context_entity', [
            'context_id' => $firstContext->getKey(),
            'entity_id' => $source->id,
            'position_x' => 120.5,
            'position_y' => 80.25,
            'is_pinned' => true,
        ]);
        $this->assertDatabaseHas('cvc_context_entity', [
            'context_id' => $secondContext->getKey(),
            'entity_id' => $source->id,
            'position_x' => -30.0,
            'position_y' => 410.0,
            'is_pinned' => false,
        ]);
        $this->assertDatabaseHas('cvc_relations', [
            'id' => $relation->getKey(),
            'context_id' => $firstContext->getKey(),
            'relation_type' => 'depends_on',
            'is_directed' => true,
            'deleted_at' => null,
        ]);

        $this->app->make(DeleteRelation::class)->handle((string) $relation->getKey());

        $this->assertSoftDeleted('cvc_relations', ['id' => $relation->getKey()]);
        $this->assertDatabaseCount('cvc_entities', 2);
    }
}
