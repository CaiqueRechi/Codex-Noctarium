<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Versions\CreateVaultVersion;
use CrowVaultCanvas\Application\Versions\RestoreVaultVersion;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

final class DocumentOwnContentTest extends TestCase
{
    use RefreshDatabase;

    private const TOLERANCE = 1e-12;

    private const SINGLE_PARAGRAPH = '**Olá**';

    private const SINGLE_PARAGRAPH_OWN_CONTENT = 5.4;

    public function testRf03ANewNoteStartsWithNoOwnContent(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->initializeContext()->getKey());

        self::assertSame(0.0, $this->storedOwnContent($note->id));
    }

    public function testRf03SavingANoteStoresTheMeasureOfTheSavedContent(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->initializeContext()->getKey());

        $this->patchJson(route('cvc.documents.update', $note->id), [
            'content' => self::SINGLE_PARAGRAPH,
            'revision' => 1,
        ])->assertOk();

        self::assertEqualsWithDelta(
            self::SINGLE_PARAGRAPH_OWN_CONTENT,
            $this->storedOwnContent($note->id),
            self::TOLERANCE,
        );
    }

    public function testRf03ARejectedSaveKeepsThePreviousMeasure(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->initializeContext()->getKey());
        $this->app->make(SaveDocument::class)->handle($note->id, self::SINGLE_PARAGRAPH, 1);

        $this->patchJson(route('cvc.documents.update', $note->id), [
            'content' => 'Conteúdo de uma aba desatualizada.',
            'revision' => 1,
        ])->assertConflict();

        self::assertEqualsWithDelta(
            self::SINGLE_PARAGRAPH_OWN_CONTENT,
            $this->storedOwnContent($note->id),
            self::TOLERANCE,
        );
    }

    public function testRf03RestoringAVersionRestoresTheMeasureOfItsContent(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->initializeContext()->getKey());
        $save = $this->app->make(SaveDocument::class);
        $save->handle($note->id, self::SINGLE_PARAGRAPH, 1);
        $version = $this->app->make(CreateVaultVersion::class)->handle(
            (string) Perspective::query()->firstOrFail()->getKey(),
            'Antes da edição',
            '42',
        );
        $save->handle($note->id, "# Muito maior\n\nCom outro parágrafo.", 2);

        $this->app->make(RestoreVaultVersion::class)->handle((string) $version->getKey(), '42');

        self::assertEqualsWithDelta(
            self::SINGLE_PARAGRAPH_OWN_CONTENT,
            $this->storedOwnContent($note->id),
            self::TOLERANCE,
        );
    }

    public function testRf14MigrationRollsBackAndReappliesWithoutLosingDocuments(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->initializeContext()->getKey());
        $this->app->make(SaveDocument::class)->handle($note->id, self::SINGLE_PARAGRAPH, 1);
        $migration = require __DIR__.'/../../database/migrations/2026_11_10_000016_add_own_content_to_cvc_documents.php';

        $migration->down();

        self::assertFalse(Schema::hasColumn('cvc_documents', 'own_content'));
        $this->assertDatabaseHas('cvc_documents', ['entity_id' => $note->id, 'revision' => 2]);

        $migration->up();

        self::assertTrue(Schema::hasColumn('cvc_documents', 'own_content'));
        self::assertNull($this->storedOwnContent($note->id));
        $this->assertDatabaseHas('cvc_documents', ['entity_id' => $note->id, 'revision' => 2]);
    }

    private function initializeContext(): KnowledgeContext
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        return KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }

    private function storedOwnContent(string $entityId): ?float
    {
        return MarkdownDocument::query()->findOrFail($entityId)->own_content;
    }
}
