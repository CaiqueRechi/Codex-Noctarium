<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Workspace;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Domain\Knowledge\Models\WorkspaceState;
use Illuminate\Support\Facades\DB;

final class SaveWorkspaceState
{
    public function handle(
        string $userId,
        float $x,
        float $y,
        float $zoom,
        ?string $focusEntityId,
        ?string $perspectiveId = null,
        ?string $focusContextId = null,
    ): WorkspaceSnapshot {
        $vaultId = (string) config('crow-vault-canvas.vault.id');

        if ($focusEntityId !== null) {
            KnowledgeEntity::query()
                ->whereKey($focusEntityId)
                ->where('vault_id', $vaultId)
                ->firstOrFail();
        }

        if ($perspectiveId !== null) {
            Perspective::query()
                ->whereKey($perspectiveId)
                ->where('vault_id', $vaultId)
                ->firstOrFail();
        }

        if ($focusContextId !== null) {
            KnowledgeContext::query()
                ->whereKey($focusContextId)
                ->where('vault_id', $vaultId)
                ->firstOrFail();
        }

        DB::transaction(function () use ($userId, $x, $y, $zoom, $focusEntityId, $perspectiveId, $focusContextId, $vaultId): void {
            WorkspaceState::query()->updateOrCreate(
                [
                    'vault_id' => $vaultId,
                    'user_id' => $userId,
                ],
                [
                    'viewport_x' => $x,
                    'viewport_y' => $y,
                    'viewport_zoom' => $zoom,
                    'focus_entity_id' => $focusEntityId,
                    'perspective_id' => $perspectiveId,
                    'focus_context_id' => $focusContextId,
                ],
            );
        }, 3);

        return new WorkspaceSnapshot($x, $y, $zoom, $focusEntityId, $perspectiveId, $focusContextId);
    }
}
