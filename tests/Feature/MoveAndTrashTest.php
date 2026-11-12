<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\AttachEntityToContext;
use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class MoveAndTrashTest extends TestCase
{
    use RefreshDatabase;

    private KnowledgeContext $context;

    private KnowledgeContext $other;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $this->other = KnowledgeContext::query()->create([
            'vault_id' => $this->context->vault_id,
            'parent_id' => $this->context->parent_id,
            'kind' => KnowledgeContext::KIND_CONTEXT,
            'name' => 'Outro',
            'sort_order' => 1,
        ]);
    }

    public function testRf08MovesANoteAndItsSubnotesComeAlong(): void
    {
        $note = $this->note($this->context);
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note);
        $subnote = $this->note($space);

        $this->postJson(route('cvc.entities.move', $note), [
            'from_context_id' => $this->context->getKey(),
            'to_context_id' => $this->other->getKey(),
        ])->assertNoContent();

        $places = KnowledgeEntity::query()->findOrFail($note)->contexts()->pluck('cvc_contexts.id')->all();
        self::assertSame([(string) $this->other->getKey()], array_map('strval', $places));
        self::assertTrue(KnowledgeEntity::query()->findOrFail($subnote)->contexts()->whereKey($space->getKey())->exists());
    }

    public function testRf08RefusesToMoveANoteIntoItsOwnSubnotes(): void
    {
        $note = $this->note($this->context);
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note);

        $this->postJson(route('cvc.entities.move', $note), [
            'from_context_id' => $this->context->getKey(),
            'to_context_id' => $space->getKey(),
        ])->assertUnprocessable();

        self::assertTrue(KnowledgeEntity::query()->findOrFail($note)->contexts()->whereKey($this->context->getKey())->exists());
    }

    public function testD13TakesANoteOutOfOneSpaceOnlyWhenItLivesInAnother(): void
    {
        $note = $this->note($this->context);

        $this->deleteJson(route('cvc.contexts.entities.destroy', [$this->context, $note]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('context_id');

        $this->app->make(AttachEntityToContext::class)->handle((string) $this->other->getKey(), $note);

        $this->deleteJson(route('cvc.contexts.entities.destroy', [$this->context, $note]))->assertNoContent();

        $places = KnowledgeEntity::query()->findOrFail($note)->contexts()->pluck('cvc_contexts.id')->all();
        self::assertSame([(string) $this->other->getKey()], array_map('strval', $places));
    }

    public function testD13AsksBeforeDeletingANoteWithSubnotes(): void
    {
        $note = $this->note($this->context);
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note);
        $this->note($space);

        $this->deleteJson(route('cvc.entities.destroy', $note))
            ->assertConflict()
            ->assertJsonPath('code', 'has_subnotes')
            ->assertJsonPath('subnotes', 1);

        self::assertFalse(KnowledgeEntity::query()->findOrFail($note)->trashed());
    }

    public function testD13TrashesTheSubnotesButLeavesAliveThoseThatLiveElsewhere(): void
    {
        $note = $this->note($this->context);
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note);
        $onlyHere = $this->note($space);
        $alsoElsewhere = $this->note($space);
        $this->app->make(AttachEntityToContext::class)->handle((string) $this->other->getKey(), $alsoElsewhere);

        $this->deleteJson(route('cvc.entities.destroy', ['entity' => $note, 'with_subnotes' => 1]))
            ->assertOk()
            ->assertJsonPath('trashedSubnoteIds', [$onlyHere]);

        self::assertTrue(KnowledgeEntity::withTrashed()->findOrFail($note)->trashed());
        self::assertTrue(KnowledgeEntity::withTrashed()->findOrFail($onlyHere)->trashed());
        self::assertFalse(KnowledgeEntity::query()->findOrFail($alsoElsewhere)->trashed());
    }

    private function note(KnowledgeContext $context): string
    {
        return $this->app->make(CreateDocument::class)->handle((string) $context->getKey())->id;
    }
}
