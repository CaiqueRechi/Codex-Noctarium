<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Trash\DeleteEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class MeasureDocumentsCommandTest extends TestCase
{
    use RefreshDatabase;

    private const TOLERANCE = 1e-12;

    public function testRf03MeasuresDocumentsSavedBeforeTheMeasureExisted(): void
    {
        $context = $this->initializeContext();
        $first = $this->savedNote($context, '**Olá**');
        $second = $this->savedNote($context, 'Olá, ç1!');
        $this->forgetMeasures();

        $this->artisan('cvc:measure-documents', ['--chunk' => 1])->assertSuccessful();

        self::assertEqualsWithDelta(5.4, $this->storedOwnContent($first), self::TOLERANCE);
        self::assertEqualsWithDelta(7.0, $this->storedOwnContent($second), self::TOLERANCE);
    }

    public function testRf03LeavesExistingMeasuresUntouchedWhenRunAgain(): void
    {
        $note = $this->savedNote($this->initializeContext(), '**Olá**');
        MarkdownDocument::query()->whereKey($note)->update(['own_content' => 123.0]);

        $this->artisan('cvc:measure-documents')->assertSuccessful();

        self::assertSame(123.0, $this->storedOwnContent($note));
    }

    public function testRf03MeasuresNotesInTheTrashSoRestoringThemNeedsNoSecondRun(): void
    {
        $note = $this->savedNote($this->initializeContext(), '**Olá**');
        $this->app->make(DeleteEntity::class)->handle($note);
        $this->forgetMeasures();

        $this->artisan('cvc:measure-documents')->assertSuccessful();

        self::assertEqualsWithDelta(
            5.4,
            MarkdownDocument::withTrashed()->findOrFail($note)->own_content,
            self::TOLERANCE,
        );
    }

    public function testRf03ReportsAnUnreadableDocumentAndStillMeasuresTheOthers(): void
    {
        $context = $this->initializeContext();
        $readable = $this->savedNote($context, '**Olá**');
        $tampered = $this->savedNote($context, 'Conteúdo original.');
        $this->forgetMeasures();
        MarkdownDocument::query()->whereKey($tampered)->update(['content_hash' => hash('sha256', 'outro')]);

        $this->artisan('cvc:measure-documents')->assertFailed();

        self::assertEqualsWithDelta(5.4, $this->storedOwnContent($readable), self::TOLERANCE);
        self::assertNull($this->storedOwnContent($tampered));
    }

    private function initializeContext(): KnowledgeContext
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        return KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }

    private function savedNote(KnowledgeContext $context, string $content): string
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $this->app->make(SaveDocument::class)->handle($note->id, $content, 1);

        return $note->id;
    }

    private function forgetMeasures(): void
    {
        MarkdownDocument::withTrashed()->update(['own_content' => null]);
    }

    private function storedOwnContent(string $entityId): ?float
    {
        return MarkdownDocument::query()->findOrFail($entityId)->own_content;
    }
}
