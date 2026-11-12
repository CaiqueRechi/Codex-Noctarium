<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Workspace\OpenWorkspaceState;
use CrowVaultCanvas\Application\Workspace\SaveWorkspaceState;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Auth\GenericUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;

final class WorkspaceStateTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_04_reopens_the_last_camera_and_focus_without_changing_content(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $entityId = $this->postJson(route('cvc.documents.store'), [
            'context_id' => $context->getKey(),
        ])->assertCreated()->json('document.id');
        self::assertIsString($entityId);
        $perspectiveId = (string) Perspective::query()->firstOrFail()->getKey();

        $saveWorkspace = $this->app->make(SaveWorkspaceState::class);
        $contextId = (string) $context->getKey();
        $saveWorkspace->handle('42', -320.5, 88.25, 1.4, $entityId, $perspectiveId, $contextId);
        $saveWorkspace->handle('42', -180.75, 41.5, 1.2, $entityId, $perspectiveId, $contextId);

        $snapshot = $this->app->make(OpenWorkspaceState::class)->handle('42');

        self::assertSame(-180.75, $snapshot->x);
        self::assertSame(41.5, $snapshot->y);
        self::assertSame(1.2, $snapshot->zoom);
        self::assertSame($entityId, $snapshot->focusEntityId);
        self::assertSame($perspectiveId, $snapshot->perspectiveId);
        self::assertSame($contextId, $snapshot->focusContextId);
        $this->assertDatabaseCount('cvc_workspace_states', 1);
        $this->assertDatabaseHas('cvc_documents', [
            'entity_id' => $entityId,
            'revision' => 1,
            'content_hash' => hash('sha256', ''),
        ]);
    }

    public function test_rf_04_returns_a_stable_default_without_creating_state(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        $snapshot = $this->app->make(OpenWorkspaceState::class)->handle('42');

        self::assertSame(120.0, $snapshot->x);
        self::assertSame(120.0, $snapshot->y);
        self::assertSame(0.65, $snapshot->zoom);
        self::assertNull($snapshot->focusEntityId);
        self::assertNotNull($snapshot->perspectiveId);
        self::assertNull($snapshot->focusContextId);
        $this->assertDatabaseCount('cvc_workspace_states', 0);
    }

    /** @return array<string, array{float}> */
    public static function zoomsTheCanvasAllows(): array
    {
        return [
            'smallest zoom of the canvas' => [0.01],
            'zoom a framed space reached in the browser' => [0.17],
            'largest zoom of the canvas' => [100.0],
        ];
    }

    #[DataProvider('zoomsTheCanvasAllows')]
    public function testRf04SavesEveryZoomTheCanvasAllows(float $zoom): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->actingAs(new GenericUser(['id' => 42]));

        $this->patchJson(route('cvc.workspace.update'), [
            'viewport' => ['x' => 10, 'y' => 20, 'zoom' => $zoom],
        ])->assertOk()->assertJsonPath('workspace.viewport.zoom', $zoom);

        self::assertSame($zoom, $this->app->make(OpenWorkspaceState::class)->handle('42')->zoom);
    }

    /** @return array<string, array{float}> */
    public static function zoomsOutsideTheCanvas(): array
    {
        return [
            'below the smallest zoom' => [0.009],
            'above the largest zoom' => [100.5],
        ];
    }

    #[DataProvider('zoomsOutsideTheCanvas')]
    public function testRf04RejectsAZoomOutsideTheCanvasLimits(float $zoom): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->actingAs(new GenericUser(['id' => 42]));

        $this->patchJson(route('cvc.workspace.update'), [
            'viewport' => ['x' => 10, 'y' => 20, 'zoom' => $zoom],
        ])->assertUnprocessable()->assertJsonValidationErrors('viewport.zoom');

        $this->assertDatabaseCount('cvc_workspace_states', 0);
    }
}
