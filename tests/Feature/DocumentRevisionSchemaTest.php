<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\DocumentRevision;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

final class DocumentRevisionSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_hybrid_revision_schema_accepts_content_and_extensible_metadata(): void
    {
        self::assertTrue(Schema::hasTable('cvc_document_revisions'));
        self::assertTrue(Schema::hasColumn('cvc_documents', 'current_revision_id'));

        $this->artisan('cvc:initialize')->assertSuccessful();
        $contextId = (string) KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail()
            ->getKey();
        $document = $this->app->make(CreateDocument::class)->handle($contextId);
        $content = "# Banco\n\nConteúdo preparado para a próxima integração.";
        $revision = DocumentRevision::query()->create([
            'entity_id' => $document->id,
            'revision' => 1,
            'format' => 'markdown',
            'content' => $content,
            'metadata' => [
                'schema_version' => 1,
                'source' => 'migration',
            ],
            'content_hash' => hash('sha256', $content),
            'content_bytes' => strlen($content),
        ]);

        MarkdownDocument::query()
            ->whereKey($document->id)
            ->update(['current_revision_id' => $revision->getKey()]);

        $stored = MarkdownDocument::query()->findOrFail($document->id);

        self::assertSame($revision->getKey(), $stored->currentRevision?->getKey());
        self::assertSame($content, $stored->currentRevision?->content);
        self::assertSame(1, $stored->currentRevision?->metadata['schema_version']);
        $this->assertDatabaseCount('cvc_document_revisions', 1);
    }
}
