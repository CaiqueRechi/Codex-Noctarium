<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class UseCountersTest extends TestCase
{
    use RefreshDatabase;

    private KnowledgeContext $context;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
    }

    public function testRf10CountsEveryOpeningOfANoteAsAnAccess(): void
    {
        $note = $this->note('Planeta');

        $this->getJson(route('cvc.documents.show', $note))->assertOk();
        $this->getJson(route('cvc.documents.show', $note))->assertOk();

        self::assertSame(2, KnowledgeEntity::query()->findOrFail($note)->access_count);
    }

    public function testRf10CountsANoteChosenInTheCompassAsASearch(): void
    {
        $note = $this->note('Planeta');

        $this->postJson(route('cvc.entities.searches.store', $note))->assertNoContent();

        $entity = KnowledgeEntity::query()->findOrFail($note);
        self::assertSame(1, $entity->search_count);
        self::assertSame(0, $entity->access_count);
    }

    public function testRf10DoesNotCountANoteOutsideTheOpenVault(): void
    {
        $this->postJson(route('cvc.entities.searches.store', (string) Str::uuid()))->assertNotFound();
    }

    public function testRf10ScoresAccessesSearchesAndLinksWithWeightOne(): void
    {
        $visited = $this->note('Pomar');
        $searched = $this->note('Ponte');
        $linked = $this->note('Porto');
        $this->note('Prisma');
        $other = $this->note('Outro');

        foreach (range(1, 3) as $opening) {
            $this->getJson(route('cvc.documents.show', $visited))->assertOk();
        }

        foreach (range(1, 2) as $choice) {
            $this->postJson(route('cvc.entities.searches.store', $searched))->assertNoContent();
        }

        $this->app->make(CreateRelation::class)->handle($linked, $other, null, null, false, []);

        $targets = collect($this->getJson(route('cvc.link-targets', ['prefix' => 'p']))->json('targets'));

        self::assertSame(['Pomar', 'Ponte', 'Porto', 'Prisma'], $targets->pluck('title')->all());
        self::assertSame([3, 2, 1, 0], $targets->pluck('score')->all());
    }

    public function testRf14CounterMigrationRollsBackAndReappliesWithoutLosingNotes(): void
    {
        $note = $this->note('Planeta');
        $migration = require __DIR__.'/../../database/migrations/2026_11_12_000018_add_use_counters_to_cvc_entities.php';

        $migration->down();

        self::assertFalse(Schema::hasColumn('cvc_entities', 'access_count'));
        self::assertFalse(Schema::hasColumn('cvc_entities', 'search_count'));
        $this->assertDatabaseHas('cvc_entities', ['id' => $note]);

        $migration->up();

        $this->assertDatabaseHas('cvc_entities', ['id' => $note, 'access_count' => 0, 'search_count' => 0]);
    }

    private function note(string $title): string
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());
        KnowledgeEntity::query()->whereKey($note->id)->update(['title' => $title]);

        return $note->id;
    }
}
