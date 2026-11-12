<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Http\RelationPresenter;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class RelationTitlesTest extends TestCase
{
    use RefreshDatabase;

    public function testRf02SendsTheTitleOfBothEndsOfARelation(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $createDocument = $this->app->make(CreateDocument::class);
        $source = $createDocument->handle((string) $context->getKey());
        $target = $createDocument->handle((string) $context->getKey());
        KnowledgeEntity::query()->whereKey($source->id)->update(['title' => 'Origem']);
        KnowledgeEntity::query()->whereKey($target->id)->update(['title' => 'Destino']);

        $this->postJson(route('cvc.relations.store'), [
            'source_entity_id' => $source->id,
            'target_entity_id' => $target->id,
            'context_id' => null,
            'type' => null,
            'directed' => false,
            'properties' => [],
        ])
            ->assertCreated()
            ->assertJsonPath('relation.sourceTitle', 'Origem')
            ->assertJsonPath('relation.targetTitle', 'Destino');

        $stored = KnowledgeRelation::query()->sole();
        $presented = $this->app->make(RelationPresenter::class)->relation($stored);

        self::assertSame('Origem', $presented['sourceTitle']);
        self::assertSame('Destino', $presented['targetTitle']);
    }
}
