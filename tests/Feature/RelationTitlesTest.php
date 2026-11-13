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

        $response = $this->postJson(route('cvc.relations.store'), [
            'source_entity_id' => $source->id,
            'target_entity_id' => $target->id,
            'context_id' => null,
            'type' => null,
            'directed' => false,
            'properties' => [],
        ])->assertCreated();

        $titles = [$source->id => 'Origem', $target->id => 'Destino'];
        self::assertSame(
            $titles[$response->json('relation.sourceEntityId')],
            $response->json('relation.sourceTitle'),
        );
        self::assertSame(
            $titles[$response->json('relation.targetEntityId')],
            $response->json('relation.targetTitle'),
        );

        $stored = KnowledgeRelation::query()->sole();
        $presented = $this->app->make(RelationPresenter::class)->relation($stored);

        self::assertSame($titles[$presented['sourceEntityId']], $presented['sourceTitle']);
        self::assertSame($titles[$presented['targetEntityId']], $presented['targetTitle']);
    }
}
