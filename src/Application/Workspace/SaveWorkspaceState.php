<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Workspace;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
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
    ): WorkspaceSnapshot {
        $vaultId = (string) config('crow-vault-canvas.vault.id');

        if ($focusEntityId !== null) {
            KnowledgeEntity::query()
                ->whereKey($focusEntityId)
                ->where('vault_id', $vaultId)
                ->firstOrFail();
        }

        DB::transaction(function () use ($userId, $x, $y, $zoom, $focusEntityId, $vaultId): void {
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
                ],
            );
        }, 3);

        return new WorkspaceSnapshot($x, $y, $zoom, $focusEntityId);
    }
}
