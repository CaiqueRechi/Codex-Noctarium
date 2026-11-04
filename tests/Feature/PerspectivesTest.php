<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class PerspectivesTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_09_derived_perspective_evolves_without_changing_its_source(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $document = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $source = Perspective::query()->firstOrFail();

        $this->patchJson(route('cvc.perspectives.layouts.update', [
            'perspective' => $source->getKey(),
            'context' => $context->getKey(),
            'entity' => $document->id,
        ]), [
            'position' => ['x' => 120.5, 'y' => 80.25],
            'pinned' => true,
        ])->assertOk();
        $this->patchJson(route('cvc.perspectives.update', ['perspective' => $source->getKey()]), [
            'name' => 'Arquitetura',
            'filters' => [
                'context_ids' => [$context->getKey()],
                'entity_types' => [],
            ],
        ])->assertOk();

        $derivedId = $this->postJson(route('cvc.perspectives.store'), [
            'name' => 'Apresentação',
            'source_perspective_id' => $source->getKey(),
            'filters' => [
                'context_ids' => [],
                'entity_types' => ['ignorado-na-cópia'],
            ],
        ])->assertCreated()
            ->assertJsonPath('perspective.sourcePerspectiveId', $source->getKey())
            ->assertJsonPath('perspective.filters.contextIds.0', $context->getKey())
            ->assertJsonPath('perspective.layouts.0.isPinned', true)
            ->json('perspective.id');

        self::assertIsString($derivedId);
        $this->patchJson(route('cvc.perspectives.update', ['perspective' => $derivedId]), [
            'name' => 'Apresentação enxuta',
            'filters' => [
                'context_ids' => [],
                'entity_types' => ['referência'],
            ],
        ])->assertOk();
        $this->patchJson(route('cvc.perspectives.layouts.update', [
            'perspective' => $derivedId,
            'context' => $context->getKey(),
            'entity' => $document->id,
        ]), [
            'position' => ['x' => -30, 'y' => 410],
            'pinned' => false,
        ])->assertOk();

        $source->refresh()->load('layouts');
        $derived = Perspective::query()->with('layouts')->findOrFail($derivedId);

        self::assertSame('Arquitetura', $source->name);
        self::assertSame([$context->getKey()], $source->filters['context_ids']);
        self::assertSame(120.5, $source->layouts->firstOrFail()->position_x);
        self::assertTrue($source->layouts->firstOrFail()->is_pinned);
        self::assertSame('Apresentação enxuta', $derived->name);
        self::assertSame(['referência'], $derived->filters['entity_types']);
        self::assertSame(-30.0, $derived->layouts->firstOrFail()->position_x);
        self::assertFalse($derived->layouts->firstOrFail()->is_pinned);
    }

    public function test_rf_09_rejects_filters_outside_the_open_vault(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $perspective = Perspective::query()->firstOrFail();

        $this->patchJson(route('cvc.perspectives.update', ['perspective' => $perspective->getKey()]), [
            'name' => 'Inválida',
            'filters' => [
                'context_ids' => ['019a34a8-0c7e-71ec-88ca-c4fb55749999'],
                'entity_types' => [],
            ],
        ])->assertUnprocessable();
    }
}
