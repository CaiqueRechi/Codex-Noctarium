<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\OpenContextSlice;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Http\ContextPresenter;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class PaintEntityTest extends TestCase
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

    public function testRf02PaintsANoteWithAToneOfTheThemeAndSendsItWithTheSpace(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());

        $this->patchJson(route('cvc.entities.color.update', $note->id), ['color' => 'aurora'])
            ->assertOk()
            ->assertJsonPath('entity.color', 'aurora');

        $slice = $this->app->make(ContextPresenter::class)->slice(
            $this->app->make(OpenContextSlice::class)->handle((string) $this->context->getKey()),
        );

        self::assertSame('aurora', $slice['contexts'][0]['documents'][0]['color']);
    }

    public function testRf02TakesTheColorAwayWithNull(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());
        $this->patchJson(route('cvc.entities.color.update', $note->id), ['color' => 'brasa'])->assertOk();

        $this->patchJson(route('cvc.entities.color.update', $note->id), ['color' => null])
            ->assertOk()
            ->assertJsonPath('entity.color', null);

        $this->assertDatabaseHas('cvc_entities', ['id' => $note->id, 'color' => null]);
    }

    public function testRf02RefusesAColorOutsideTheTheme(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());

        foreach (['#ff0000', 'red', ''] as $color) {
            $this->patchJson(route('cvc.entities.color.update', $note->id), ['color' => $color])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('color');
        }
    }

    public function testRf02DoesNotPaintANoteOutsideTheOpenVault(): void
    {
        $this->patchJson(route('cvc.entities.color.update', (string) Str::uuid()), ['color' => 'vazio'])
            ->assertNotFound();
    }

    public function testRf14ColorMigrationRollsBackAndReappliesWithoutLosingNotes(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());
        $migration = require __DIR__.'/../../database/migrations/2026_11_12_000017_add_color_to_cvc_entities.php';

        $migration->down();

        self::assertFalse(Schema::hasColumn('cvc_entities', 'color'));
        $this->assertDatabaseHas('cvc_entities', ['id' => $note->id]);

        $migration->up();

        self::assertTrue(Schema::hasColumn('cvc_entities', 'color'));
        $this->assertDatabaseHas('cvc_entities', ['id' => $note->id, 'color' => null]);
    }
}
