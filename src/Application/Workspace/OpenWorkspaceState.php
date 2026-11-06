<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Workspace;

use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Domain\Knowledge\Models\WorkspaceState;

final class OpenWorkspaceState
{
    public function handle(string $userId): WorkspaceSnapshot
    {
        $state = WorkspaceState::query()
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->where('user_id', $userId)
            ->first();

        $defaultPerspectiveId = Perspective::query()
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->oldest()
            ->value('id');

        if ($state === null) {
            return new WorkspaceSnapshot(120, 120, 0.65, null, $defaultPerspectiveId);
        }

        return new WorkspaceSnapshot(
            $state->viewport_x,
            $state->viewport_y,
            $state->viewport_zoom,
            $state->focus_entity_id,
            $state->perspective_id ?? $defaultPerspectiveId,
            $state->focus_context_id,
        );
    }
}
