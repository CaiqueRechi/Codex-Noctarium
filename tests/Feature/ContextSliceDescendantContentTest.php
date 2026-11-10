<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\AttachEntityToContext;
use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Application\Contexts\EnsureContextDocument;
use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Trash\DeleteEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class ContextSliceDescendantContentTest extends TestCase
{
    use RefreshDatabase;

    private const TOLERANCE = 1e-12;

    private const PARAGRAPH = '**Olá**';

    private const PARAGRAPH_CONTENT = 5.4;

    private const SENTENCE = 'Olá, ç1!';

    private const SENTENCE_CONTENT = 7.0;

    private const LETTER = 'a';

    private const LETTER_CONTENT = 1.8;

    public function testRf03ANoteWithoutSubnotesHasNoDescendantContent(): void
    {
        $context = $this->initializeContext();
        $this->note($context, self::PARAGRAPH);

        self::assertEqualsWithDelta(0.0, $this->shownDocument($context)['descendantContent'], self::TOLERANCE);
    }

    public function testRf03ANoteSumsEveryLevelBeneathItButNotItsOwnContent(): void
    {
        $context = $this->initializeContext();
        $parent = $this->note($context, self::PARAGRAPH);
        $child = $this->note($this->spaceOf($parent), self::SENTENCE);
        $this->note($this->spaceOf($child), self::LETTER);

        $shown = $this->shownDocument($context);

        self::assertEqualsWithDelta(self::PARAGRAPH_CONTENT, $shown['ownContent'], self::TOLERANCE);
        self::assertEqualsWithDelta(
            self::SENTENCE_CONTENT + self::LETTER_CONTENT,
            $shown['descendantContent'],
            self::TOLERANCE,
        );
    }

    public function testRf03ANoteSharedByTwoPathsIsCountedOnce(): void
    {
        $context = $this->initializeContext();
        $parent = $this->note($context, self::PARAGRAPH);
        $parentSpace = $this->spaceOf($parent);
        $left = $this->note($parentSpace, self::LETTER);
        $right = $this->note($parentSpace, self::LETTER);
        $shared = $this->note($this->spaceOf($left), self::SENTENCE);
        $this->app->make(AttachEntityToContext::class)->handle((string) $this->spaceOf($right)->getKey(), $shared);

        self::assertEqualsWithDelta(
            2 * self::LETTER_CONTENT + self::SENTENCE_CONTENT,
            $this->shownDocument($context)['descendantContent'],
            self::TOLERANCE,
        );
    }

    public function testRf03AContextSumsItsNotesAndTheContentOfContextsThatAreNotes(): void
    {
        $context = $this->initializeContext();
        $shownContext = $this->app->make(CreateContext::class)->handle('Mostrado', (string) $context->getKey());
        $this->note($shownContext, self::PARAGRAPH);
        $nested = $this->app->make(CreateContext::class)->handle('Interno', (string) $shownContext->getKey());
        $nestedOwner = $this->app->make(EnsureContextDocument::class)->handle((string) $nested->getKey());
        $this->app->make(SaveDocument::class)->handle($nestedOwner->id, self::SENTENCE, $nestedOwner->revision);
        $this->note($nested, self::LETTER);

        $slice = $this->getJson(route('cvc.contexts.show', $context))->assertOk();

        self::assertEqualsWithDelta(
            self::PARAGRAPH_CONTENT + self::SENTENCE_CONTENT + self::LETTER_CONTENT,
            $slice->json('slice.contexts.0.contexts.0.descendantContent'),
            self::TOLERANCE,
        );
        self::assertEqualsWithDelta(
            self::PARAGRAPH_CONTENT + self::SENTENCE_CONTENT + self::LETTER_CONTENT,
            $slice->json('slice.contexts.0.descendantContent'),
            self::TOLERANCE,
        );
    }

    public function testRf03AContextThatIsANoteDoesNotCountItsOwnContentAsDescendant(): void
    {
        $context = $this->initializeContext();
        $legacy = $this->app->make(CreateContext::class)->handle('Legado', (string) $context->getKey());
        $owner = $this->app->make(EnsureContextDocument::class)->handle((string) $legacy->getKey());
        $this->app->make(SaveDocument::class)->handle($owner->id, self::SENTENCE, $owner->revision);
        $this->note($legacy, self::LETTER);

        $shown = $this->getJson(route('cvc.contexts.show', $context))->assertOk()
            ->json('slice.contexts.0.contexts.0');

        self::assertEqualsWithDelta(self::SENTENCE_CONTENT, $shown['ownContent'], self::TOLERANCE);
        self::assertEqualsWithDelta(self::LETTER_CONTENT, $shown['descendantContent'], self::TOLERANCE);
    }

    public function testRf03ANoteInTheTrashStopsCounting(): void
    {
        $context = $this->initializeContext();
        $parent = $this->note($context, self::PARAGRAPH);
        $space = $this->spaceOf($parent);
        $this->note($space, self::LETTER);
        $trashed = $this->note($space, self::SENTENCE);
        $this->app->make(DeleteEntity::class)->handle($trashed);

        self::assertEqualsWithDelta(
            self::LETTER_CONTENT,
            $this->shownDocument($context)['descendantContent'],
            self::TOLERANCE,
        );
    }

    public function testRf03RootUniversesCarryTheContentBeneathThem(): void
    {
        $context = $this->initializeContext();
        $this->note($context, self::PARAGRAPH);
        $universeId = $context->parent_id;

        $universe = collect($this->getJson(route('cvc.contexts.index'))->assertOk()->json('slice.contexts'))
            ->firstWhere('id', $universeId);

        self::assertEqualsWithDelta(self::PARAGRAPH_CONTENT, $universe['descendantContent'], self::TOLERANCE);
    }

    private function initializeContext(): KnowledgeContext
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        return KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }

    private function note(KnowledgeContext $context, string $content): string
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $this->app->make(SaveDocument::class)->handle($note->id, $content, 1);

        return $note->id;
    }

    private function spaceOf(string $noteId): KnowledgeContext
    {
        return $this->app->make(EnsureNoteSpace::class)->handle($noteId);
    }

    /** @return array<string, mixed> */
    private function shownDocument(KnowledgeContext $context): array
    {
        return $this->getJson(route('cvc.contexts.show', $context))->assertOk()
            ->json('slice.contexts.0.documents.0');
    }
}
