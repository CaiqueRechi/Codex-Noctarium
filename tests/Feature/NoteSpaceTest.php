<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\AttachEntityToContext;
use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\NoteSpace;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Auth\GenericUser;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

final class NoteSpaceTest extends TestCase
{
    use RefreshDatabase;

    public function testRf03NoteSpaceIsStableAndSharedWithoutDuplicatingContent(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $saved = $this->app->make(SaveDocument::class)->handle($note->id, 'Conteúdo preservado.', 1);
        $first = $this->postJson(route('cvc.documents.space.store', $note->id))->assertOk();
        $spaceId = $first->json('spaceId');
        $this->postJson(route('cvc.documents.space.store', $note->id))->assertOk()
            ->assertJsonPath('spaceId', $spaceId);
        $other = $this->app->make(CreateContext::class)->handle('Outro', null);
        $this->app->make(AttachEntityToContext::class)->handle((string) $other->getKey(), $note->id);
        $this->getJson(route('cvc.documents.show', $note->id))->assertOk()
            ->assertJsonPath('document.id', $note->id)
            ->assertJsonPath('document.spaceId', $spaceId)
            ->assertJsonPath('document.content', 'Conteúdo preservado.')
            ->assertJsonPath('document.revision', $saved->revision);
        $this->assertDatabaseCount('cvc_note_spaces', 1);
        $this->assertDatabaseCount('cvc_entities', 1);
        $this->assertDatabaseCount('cvc_context_entity', 2);
    }

    public function testRf01SubnotesAreCreatedInsideTheirSharedSpaceWhichIsNotAnExtraUniverse(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note->id);
        $child = $this->postJson(route('cvc.documents.store'), ['context_id' => $space->getKey()])
            ->assertCreated()->json('document.id');
        $this->assertDatabaseHas('cvc_context_entity', ['context_id' => $space->getKey(), 'entity_id' => $child]);
        $this->getJson(route('cvc.contexts.show', $space))->assertOk()
            ->assertJsonPath('slice.contexts.0.ownerEntityId', $note->id)
            ->assertJsonPath('slice.contexts.0.kind', 'context')
            ->assertJsonPath('slice.contexts.0.documents.0.id', $child);
        $roots = $this->getJson(route('cvc.contexts.index'))->assertOk()->json('slice.contexts');
        self::assertNotContains((string) $space->getKey(), array_column($roots, 'id'));
    }

    public function testRf03RejectsSelfAndDescendantAttachmentsWithoutChangingMemberships(): void
    {
        $context = $this->initializeContext();
        $parent = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $parentSpace = $this->app->make(EnsureNoteSpace::class)->handle($parent->id);
        $child = $this->app->make(CreateDocument::class)->handle((string) $parentSpace->getKey());
        $childSpace = $this->app->make(EnsureNoteSpace::class)->handle($child->id);
        $before = NoteSpace::query()->count();

        foreach ([$parentSpace, $childSpace] as $invalidTarget) {
            $this->postJson(route('cvc.contexts.entities.store', $invalidTarget), ['entity_id' => $parent->id])
                ->assertUnprocessable()->assertJsonValidationErrors('entity_id');
        }

        $this->assertDatabaseMissing('cvc_context_entity', ['context_id' => $parentSpace->getKey(), 'entity_id' => $parent->id]);
        $this->assertDatabaseMissing('cvc_context_entity', ['context_id' => $childSpace->getKey(), 'entity_id' => $parent->id]);
        self::assertSame($before, NoteSpace::query()->count());
    }

    public function testRf03RejectsCyclesThatCrossLegacyContextsAndNoteSpaces(): void
    {
        $context = $this->initializeContext();
        $legacy = $this->app->make(CreateContext::class)->handle('Legado', (string) $context->getKey());
        $note = $this->app->make(CreateDocument::class)->handle((string) $legacy->getKey());
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note->id);
        $this->patchJson(route('cvc.contexts.update', $legacy), ['name' => 'Legado', 'parent_id' => $space->getKey()])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');
        self::assertSame((string) $context->getKey(), $legacy->fresh()->parent_id);
        $this->patchJson(route('cvc.contexts.update', $space), ['name' => 'Interno', 'parent_id' => null])
            ->assertUnprocessable();
    }

    public function testRf03ADeletedOwnerCannotBeRecreatedOrReceiveHiddenWrites(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note->id);
        KnowledgeEntity::query()->findOrFail($note->id)->delete();
        $this->postJson(route('cvc.documents.space.store', $note->id))->assertNotFound();
        $this->getJson(route('cvc.contexts.show', $space))->assertNotFound();
        $this->postJson(route('cvc.documents.store'), ['context_id' => $space->getKey()])->assertNotFound();
        $this->postJson(route('cvc.contexts.store'), ['name' => 'Oculto', 'parent_id' => $space->getKey()])->assertNotFound();
        $this->assertDatabaseCount('cvc_entities', 1);
        $this->assertDatabaseCount('cvc_note_spaces', 1);
    }

    public function testRf14ForeignVaultOwnersCannotCreateSpacesInTheConfiguredVault(): void
    {
        $this->initializeContext();
        $foreignVault = Vault::query()->create(['name' => 'Outro']);
        $entity = KnowledgeEntity::query()->create(['vault_id' => $foreignVault->getKey(), 'kind' => 'document']);
        MarkdownDocument::query()->create([
            'entity_id' => $entity->getKey(), 'storage_path' => 'not-read',
            'revision' => 1, 'content_hash' => hash('sha256', ''),
        ]);
        $this->postJson(route('cvc.documents.space.store', $entity))->assertNotFound();
        $this->assertDatabaseCount('cvc_note_spaces', 0);
    }

    public function testRf03ADeletedSpaceIsNotSilentlyRecreated(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note->id);
        $space->delete();
        $this->postJson(route('cvc.documents.space.store', $note->id))->assertNotFound();
        $this->assertDatabaseCount('cvc_note_spaces', 1);
        $this->assertSoftDeleted('cvc_contexts', ['id' => $space->getKey()]);
    }

    public function testRf03AllowsSharedDescendantsWithoutAllowingReverseCycles(): void
    {
        $context = $this->initializeContext();
        $create = $this->app->make(CreateDocument::class);
        $left = $create->handle((string) $context->getKey());
        $right = $create->handle((string) $context->getKey());
        $shared = $create->handle((string) $context->getKey());
        $ensure = $this->app->make(EnsureNoteSpace::class);
        $leftSpace = $ensure->handle($left->id);
        $rightSpace = $ensure->handle($right->id);
        $sharedSpace = $ensure->handle($shared->id);
        $attach = $this->app->make(AttachEntityToContext::class);
        $attach->handle((string) $leftSpace->getKey(), $shared->id);
        $attach->handle((string) $rightSpace->getKey(), $shared->id);
        self::assertSame(3, KnowledgeEntity::query()->findOrFail($shared->id)->contexts()->count());
        $this->postJson(route('cvc.contexts.entities.store', $sharedSpace), ['entity_id' => $left->id])
            ->assertUnprocessable()->assertJsonValidationErrors('entity_id');
        $this->assertDatabaseCount('cvc_entities', 3);
    }

    public function testRf03LayoutsRemainIndependentAcrossAppearancesIncludingUniverses(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $root = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_UNIVERSE)->firstOrFail();
        $this->app->make(AttachEntityToContext::class)->handle((string) $root->getKey(), $note->id);
        $this->patchJson(route('cvc.contexts.entities.layout.update', [$context, $note->id]), [
            'position' => ['x' => -512, 'y' => 100], 'pinned' => true,
        ])->assertOk();
        $this->patchJson(route('cvc.contexts.entities.layout.update', [$root, $note->id]), [
            'position' => ['x' => 80, 'y' => 90], 'pinned' => false,
        ])->assertOk();
        $this->assertDatabaseHas('cvc_context_entity', ['context_id' => $context->getKey(), 'entity_id' => $note->id, 'position_x' => -512, 'is_pinned' => true]);
        $this->assertDatabaseHas('cvc_context_entity', ['context_id' => $root->getKey(), 'entity_id' => $note->id, 'position_x' => 80, 'is_pinned' => false]);
    }

    public function testRf14MigrationRollsBackAndReappliesWhileKeepingExistingDocuments(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $migration = require __DIR__.'/../../database/migrations/2026_11_08_000015_create_cvc_note_spaces_table.php';
        $migration->down();
        self::assertFalse(Schema::hasTable('cvc_note_spaces'));
        $this->assertDatabaseHas('cvc_entities', ['id' => $note->id]);
        $this->assertDatabaseHas('cvc_documents', ['entity_id' => $note->id, 'revision' => 1]);
        $migration->up();
        self::assertTrue(Schema::hasTable('cvc_note_spaces'));
        $this->app->make(EnsureNoteSpace::class)->handle($note->id);
        $this->assertDatabaseCount('cvc_note_spaces', 1);
    }

    public function testRf14SpaceCreationUsesTheSameMiddlewareAsDocumentCreation(): void
    {
        $routes = $this->app['router']->getRoutes();
        $documentMiddleware = $routes->getByName('cvc.documents.store')->gatherMiddleware();
        $spaceMiddleware = $routes->getByName('cvc.documents.space.store')->gatherMiddleware();
        self::assertSame([], array_diff($documentMiddleware, $spaceMiddleware));
        self::assertContains('throttle:cvc-note-space-writes', $spaceMiddleware);
    }

    public function testRf14SpaceWritesHaveIndependentUserAndIpRateLimitKeys(): void
    {
        $limiter = $this->app->make(RateLimiter::class)->limiter('cvc-note-space-writes');
        $first = Request::create('/', server: ['REMOTE_ADDR' => '192.0.2.1']);
        $first->setUserResolver(fn () => new GenericUser(['id' => 'first']));
        $otherIp = Request::create('/', server: ['REMOTE_ADDR' => '192.0.2.2']);
        $otherIp->setUserResolver(fn () => new GenericUser(['id' => 'first']));
        $otherUser = Request::create('/', server: ['REMOTE_ADDR' => '192.0.2.1']);
        $otherUser->setUserResolver(fn () => new GenericUser(['id' => 'second']));
        $limits = $limiter($first);
        self::assertSame(30, $limits[0]->maxAttempts);
        self::assertSame(60, $limits[1]->maxAttempts);
        self::assertSame($limits[0]->key, $limiter($otherIp)[0]->key);
        self::assertNotSame($limits[1]->key, $limiter($otherIp)[1]->key);
        self::assertNotSame($limits[0]->key, $limiter($otherUser)[0]->key);
        self::assertSame($limits[1]->key, $limiter($otherUser)[1]->key);
        self::assertStringNotContainsString('192.0.2.1', $limits[1]->key);
    }

    public function testRf14RepeatedSpaceWritesAreThrottledWithoutCreatingDuplicates(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $this->actingAs(new GenericUser(['id' => 1]));

        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->postJson(route('cvc.documents.space.store', $note->id))->assertOk();
        }

        $this->postJson(route('cvc.documents.space.store', $note->id))->assertStatus(429);
        $this->assertDatabaseCount('cvc_note_spaces', 1);
        $this->assertDatabaseCount('cvc_entities', 1);
    }

    private function initializeContext(): KnowledgeContext
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        return KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }
}
