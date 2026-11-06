<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\OpenContextSlice;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

final class VaultInitializationTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_02_initialization_creates_a_navigable_context_idempotently(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->artisan('cvc:initialize')->assertSuccessful();

        $this->assertDatabaseCount('cvc_vaults', 1);
        $this->assertDatabaseCount('cvc_contexts', 2);
        $this->assertDatabaseCount('cvc_perspectives', 1);
        $this->assertDatabaseHas('cvc_vaults', [
            'id' => config('crow-vault-canvas.vault.id'),
            'name' => 'Crow Vault Canvas',
        ]);
        $this->assertDatabaseHas('cvc_contexts', [
            'kind' => 'universe',
            'name' => 'Meu Universo',
            'parent_id' => null,
        ]);
        $this->assertDatabaseHas('cvc_contexts', [
            'kind' => 'context',
            'name' => 'Primeiro Contexto',
        ]);
    }

    public function test_rf_01_opening_the_vault_returns_its_initial_universe(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        $slice = $this->app->make(OpenContextSlice::class)->handle();

        self::assertCount(1, $slice->contexts);
        self::assertSame('Meu Universo', $slice->contexts->first()?->name);
        self::assertCount(1, $slice->contexts->first()?->children ?? []);
        self::assertSame('Primeiro Contexto', $slice->contexts->first()?->children->first()?->name);
    }

    public function test_rf_05_explorer_keeps_one_entity_available_in_multiple_contexts(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $slice = $this->app->make(OpenContextSlice::class)->handle();
        $universe = $slice->contexts->firstOrFail();
        $firstContext = $universe->children->firstOrFail();
        $secondContext = KnowledgeContext::query()->create([
            'vault_id' => $universe->vault_id,
            'parent_id' => $universe->getKey(),
            'kind' => KnowledgeContext::KIND_CONTEXT,
            'name' => 'Contexto Compartilhado',
            'sort_order' => 1,
        ]);
        $document = $this->app->make(CreateDocument::class)->handle(
            (string) $firstContext->getKey(),
        );

        $secondContext->entities()->attach($document->id);

        $reopenedSlice = $this->app->make(OpenContextSlice::class)->handle();
        $contexts = $reopenedSlice->contexts->firstOrFail()->children;

        self::assertCount(2, $contexts);
        self::assertTrue($contexts->every(
            fn (KnowledgeContext $context): bool => $context->entities
                ->contains(fn ($entity): bool => $entity->getKey() === $document->id),
        ));
        $this->assertDatabaseCount('cvc_entities', 1);
        $this->assertDatabaseCount('cvc_documents', 1);
        $this->assertDatabaseCount('cvc_context_entity', 2);
    }

    public function test_vault_migration_can_be_rolled_back_and_reapplied(): void
    {
        self::assertTrue(Schema::hasTable('cvc_vaults'));
        self::assertTrue(Schema::hasTable('cvc_contexts'));
        self::assertTrue(Schema::hasTable('cvc_entities'));
        self::assertTrue(Schema::hasTable('cvc_documents'));
        self::assertTrue(Schema::hasTable('cvc_workspace_states'));
        self::assertTrue(Schema::hasTable('cvc_perspectives'));
        self::assertTrue(Schema::hasTable('cvc_perspective_layouts'));
        self::assertTrue(Schema::hasTable('cvc_versions'));
        self::assertTrue(Schema::hasTable('cvc_search_index'));
        self::assertTrue(Schema::hasTable('cvc_attachments'));
        self::assertTrue(Schema::hasTable('cvc_operations'));
        self::assertTrue(Schema::hasColumn('cvc_workspace_states', 'focus_context_id'));
        self::assertTrue(Schema::hasColumn('cvc_entities', 'tags'));
        self::assertTrue(Schema::hasColumn('cvc_relations', 'cascade_deleted_by_entity_id'));

        $this->artisan('migrate:rollback')->assertSuccessful();

        self::assertFalse(Schema::hasTable('cvc_contexts'));
        self::assertFalse(Schema::hasTable('cvc_vaults'));
        self::assertFalse(Schema::hasTable('cvc_entities'));
        self::assertFalse(Schema::hasTable('cvc_documents'));
        self::assertFalse(Schema::hasTable('cvc_workspace_states'));
        self::assertFalse(Schema::hasTable('cvc_perspectives'));
        self::assertFalse(Schema::hasTable('cvc_perspective_layouts'));
        self::assertFalse(Schema::hasTable('cvc_versions'));
        self::assertFalse(Schema::hasTable('cvc_search_index'));
        self::assertFalse(Schema::hasTable('cvc_attachments'));
        self::assertFalse(Schema::hasTable('cvc_operations'));

        $this->artisan('migrate')->assertSuccessful();

        self::assertTrue(Schema::hasTable('cvc_vaults'));
        self::assertTrue(Schema::hasTable('cvc_contexts'));
        self::assertTrue(Schema::hasTable('cvc_entities'));
        self::assertTrue(Schema::hasTable('cvc_documents'));
        self::assertTrue(Schema::hasTable('cvc_workspace_states'));
        self::assertTrue(Schema::hasTable('cvc_perspectives'));
        self::assertTrue(Schema::hasTable('cvc_perspective_layouts'));
        self::assertTrue(Schema::hasTable('cvc_versions'));
        self::assertTrue(Schema::hasTable('cvc_search_index'));
        self::assertTrue(Schema::hasTable('cvc_attachments'));
        self::assertTrue(Schema::hasTable('cvc_operations'));
        self::assertTrue(Schema::hasColumn('cvc_workspace_states', 'focus_context_id'));
        self::assertTrue(Schema::hasColumn('cvc_entities', 'tags'));
        self::assertTrue(Schema::hasColumn('cvc_relations', 'cascade_deleted_by_entity_id'));
    }
}
