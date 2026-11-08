<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Search\SearchVault;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class ContextDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function testRf02LegacyContextReceivesOneDocumentWithoutLosingItsChildren(): void
    {
        $context = $this->initializeContext();
        $child = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $originalParent = $context->parent_id;
        $first = $this->postJson(route('cvc.contexts.document.store', $context))->assertOk();
        $ownerId = $first->json('document.id');
        $first->assertJsonPath('document.title', $context->name)
            ->assertJsonPath('document.content', '')
            ->assertJsonPath('document.spaceId', $context->getKey());
        $this->app->make(SaveDocument::class)->handle($ownerId, 'Descrição preservada.', 1);
        $this->postJson(route('cvc.contexts.document.store', $context))->assertOk()
            ->assertJsonPath('document.id', $ownerId)
            ->assertJsonPath('document.content', 'Descrição preservada.')
            ->assertJsonPath('document.revision', 2);
        self::assertSame($originalParent, $context->fresh()->parent_id);
        $this->assertDatabaseCount('cvc_entities', 2);
        $this->assertDatabaseCount('cvc_note_spaces', 1);
        $this->assertDatabaseHas('cvc_context_entity', ['context_id' => $context->getKey(), 'entity_id' => $child->id]);
        $this->assertDatabaseMissing('cvc_context_entity', ['context_id' => $context->getKey(), 'entity_id' => $ownerId]);
        $this->getJson(route('cvc.contexts.show', $context))->assertOk()
            ->assertJsonPath('slice.contexts.0.ownerEntityId', $ownerId)
            ->assertJsonPath('slice.contexts.0.documents.0.id', $child->id);
    }

    public function testRf02RenamingALegacyContextKeepsItsDocumentTitleConsistent(): void
    {
        $context = $this->initializeContext();
        $ownerId = $this->postJson(route('cvc.contexts.document.store', $context))->assertOk()->json('document.id');
        $this->patchJson(route('cvc.contexts.update', $context), ['name' => 'Novo nome', 'parent_id' => $context->parent_id])
            ->assertOk()->assertJsonPath('context.name', 'Novo nome');
        $this->getJson(route('cvc.documents.show', $ownerId))->assertOk()->assertJsonPath('document.title', 'Novo nome');
        self::assertSame('Novo nome', $context->fresh()->name);
    }

    public function testRf02OpeningTheContentOfAnOwnedSpaceReturnsTheOriginalNote(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note->id);
        $this->postJson(route('cvc.contexts.document.store', $space))->assertOk()
            ->assertJsonPath('document.id', $note->id)
            ->assertJsonPath('document.spaceId', $space->getKey());
        $this->assertDatabaseCount('cvc_entities', 1);
    }

    public function testRf02ADeletedContextDocumentIsNotSilentlyReplaced(): void
    {
        $context = $this->initializeContext();
        $ownerId = $this->postJson(route('cvc.contexts.document.store', $context))->assertOk()->json('document.id');
        KnowledgeEntity::query()->findOrFail($ownerId)->delete();
        $this->postJson(route('cvc.contexts.document.store', $context))->assertNotFound();
        $this->assertDatabaseCount('cvc_entities', 1);
        $this->assertDatabaseCount('cvc_note_spaces', 1);
    }

    public function testRf14AContextFromAnotherVaultCannotReceiveDocumentContent(): void
    {
        $this->initializeContext();
        $otherVault = Vault::query()->create(['name' => 'Outro']);
        $context = $otherVault->contexts()->create(['kind' => 'universe', 'name' => 'Outro']);
        $this->postJson(route('cvc.contexts.document.store', $context))->assertNotFound();
        $this->assertDatabaseCount('cvc_entities', 0);
    }

    public function testRf07UniverseContentIsSearchableAndKeepsAValidContextWithoutASelfMembership(): void
    {
        $this->initializeContext();
        $universe = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_UNIVERSE)->firstOrFail();
        $ownerId = $this->postJson(route('cvc.contexts.document.store', $universe))->assertOk()->json('document.id');
        $this->app->make(SaveDocument::class)->handle($ownerId, 'Conhecimento do universo.', 1);
        (new IndexKnowledgeEntity($ownerId))->handle($this->app->make(MarkdownStorage::class));
        $search = $this->app->make(SearchVault::class);
        $results = $search->handle('Conhecimento', null, null, null);
        self::assertSame($ownerId, $results[0]['id']);
        self::assertSame((string) $universe->getKey(), $results[0]['contextId']);
        self::assertSame($ownerId, $search->handle('Conhecimento', (string) $universe->getKey(), null, null)[0]['id']);
        $roots = $this->getJson(route('cvc.contexts.index'))->assertOk()->json('slice.contexts');
        self::assertContains((string) $universe->getKey(), array_column($roots, 'id'));
        $this->assertDatabaseMissing('cvc_context_entity', ['context_id' => $universe->getKey(), 'entity_id' => $ownerId]);
    }

    private function initializeContext(): KnowledgeContext
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        return KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }
}
