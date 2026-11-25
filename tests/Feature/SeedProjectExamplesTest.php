<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\OpenDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Domain\Knowledge\Content\Flowchart;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

final class SeedProjectExamplesTest extends TestCase
{
    use RefreshDatabase;

    public function testRf11SeedsOnceAndPreservesChangesAndDeletions(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->artisan('cvc:seed-projects')->assertSuccessful();

        $root = $this->fixtureSpace('projects');
        self::assertSame('Meus Projetos', $root->name);
        self::assertNull($root->parent_id);
        $flow = $this->fixtureSpace('save-flow');
        $document = $this->app->make(OpenDocument::class)->handle($flow->noteSpace->entity_id);
        self::assertTrue(Flowchart::isFlowchart($document->content));

        $this->app->make(SaveDocument::class)->handle($document->id, 'Conteúdo editado', $document->revision);
        $deleted = $this->fixtureSpace('salem');
        $deleted->delete();
        $relation = KnowledgeRelation::query()->firstOrFail();
        $relation->delete();
        $count = DB::table('cvc_demo_fixtures')->count();

        $this->artisan('cvc:seed-projects')->assertSuccessful();

        self::assertSame('Conteúdo editado', $this->app->make(OpenDocument::class)->handle($document->id)->content);
        self::assertSame(0, KnowledgeContext::query()->where('name', 'Memorial Salem')->count());
        self::assertNull(KnowledgeRelation::query()->find($relation->getKey()));
        self::assertSame(1, KnowledgeContext::query()->where('name', 'Meus Projetos')->count());
        self::assertSame($count, DB::table('cvc_demo_fixtures')->count());
    }

    private function fixtureSpace(string $key): KnowledgeContext
    {
        $id = DB::table('cvc_demo_fixtures')->where('fixture_key', 'note:'.$key)->value('record_id');

        return KnowledgeContext::query()->findOrFail($id);
    }
}
