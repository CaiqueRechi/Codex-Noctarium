<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Perspectives;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Domain\Knowledge\Models\PerspectiveLayout;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

final class UpdatePerspectiveLayout
{
    public function handle(
        string $perspectiveId,
        string $contextId,
        string $entityId,
        float $positionX,
        float $positionY,
        bool $isPinned,
    ): PerspectiveLayout {
        return DB::transaction(function () use (
            $perspectiveId,
            $contextId,
            $entityId,
            $positionX,
            $positionY,
            $isPinned,
        ): PerspectiveLayout {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Perspective::query()
                ->whereKey($perspectiveId)
                ->where('vault_id', $vaultId)
                ->lockForUpdate()
                ->firstOrFail();
            $context = KnowledgeContext::query()
                ->whereKey($contextId)
                ->where('vault_id', $vaultId)
                ->where('kind', KnowledgeContext::KIND_CONTEXT)
                ->firstOrFail();

            if (! $context->entities()->whereKey($entityId)->exists()) {
                throw (new ModelNotFoundException)->setModel('context entity');
            }

            $identity = [
                'perspective_id' => $perspectiveId,
                'context_id' => $contextId,
                'entity_id' => $entityId,
            ];
            $timestamp = now();
            $values = [
                'position_x' => $positionX,
                'position_y' => $positionY,
                'is_pinned' => $isPinned,
                'updated_at' => $timestamp,
            ];
            $layoutQuery = DB::table('cvc_perspective_layouts')->where($identity);

            if ($layoutQuery->exists()) {
                $layoutQuery->update($values);
            } else {
                DB::table('cvc_perspective_layouts')->insert([
                    ...$identity,
                    ...$values,
                    'created_at' => $timestamp,
                ]);
            }

            return PerspectiveLayout::query()->where($identity)->firstOrFail();
        }, 3);
    }
}
