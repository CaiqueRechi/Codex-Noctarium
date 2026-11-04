<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\OpenDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Entities\UpdateEntityProperties;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class EntityPropertiesTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_07_structuring_a_document_preserves_identity_and_content(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $created = $this->app->make(CreateDocument::class)->handle(
            (string) $context->getKey(),
        );
        $content = "# Registro\n\nConteúdo preservado.\n";
        $saved = $this->app->make(SaveDocument::class)->handle(
            $created->id,
            $content,
            $created->revision,
        );

        $entity = $this->app->make(UpdateEntityProperties::class)->handle(
            $saved->id,
            'registro',
            ['status' => 'ativo', 'prioridade' => 2],
        );
        $reopened = $this->app->make(OpenDocument::class)->handle($saved->id);

        self::assertSame($created->id, $entity->getKey());
        self::assertSame($created->id, $reopened->id);
        self::assertSame($content, $reopened->content);
        self::assertSame($saved->revision, $reopened->revision);
        self::assertSame('registro', $reopened->entityType);
        self::assertSame(
            ['status' => 'ativo', 'prioridade' => 2],
            $reopened->properties,
        );
        $this->assertDatabaseCount('cvc_entities', 1);
        $this->assertDatabaseCount('cvc_documents', 1);
    }
}
