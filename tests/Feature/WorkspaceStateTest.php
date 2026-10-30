<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Workspace\OpenWorkspaceState;
use CrowVaultCanvas\Application\Workspace\SaveWorkspaceState;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

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

        $saveWorkspace = $this->app->make(SaveWorkspaceState::class);
        $saveWorkspace->handle('42', -320.5, 88.25, 1.4, $entityId);
        $saveWorkspace->handle('42', -180.75, 41.5, 1.2, $entityId);

        $snapshot = $this->app->make(OpenWorkspaceState::class)->handle('42');

        self::assertSame(-180.75, $snapshot->x);
        self::assertSame(41.5, $snapshot->y);
        self::assertSame(1.2, $snapshot->zoom);
        self::assertSame($entityId, $snapshot->focusEntityId);
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
        $this->assertDatabaseCount('cvc_workspace_states', 0);
    }
}
