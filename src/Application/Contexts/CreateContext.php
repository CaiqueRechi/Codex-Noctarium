<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use Illuminate\Support\Facades\DB;

final class CreateContext
{
    public function handle(string $name, ?string $parentId): KnowledgeContext
    {
        return DB::transaction(function () use ($name, $parentId): KnowledgeContext {
            $vaultId = (string) config('crow-vault-canvas.vault.id');

            if ($parentId === null) {
                Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            } else {
                KnowledgeContext::query()
                    ->whereKey($parentId)
                    ->where('vault_id', $vaultId)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            $siblings = KnowledgeContext::query()->where('vault_id', $vaultId);
            $parentId === null
                ? $siblings->whereNull('parent_id')
                : $siblings->where('parent_id', $parentId);
            $sortOrder = ((int) $siblings->max('sort_order')) + 1;

            $context = KnowledgeContext::query()->create([
                'vault_id' => $vaultId,
                'parent_id' => $parentId,
                'kind' => $parentId === null
                    ? KnowledgeContext::KIND_UNIVERSE
                    : KnowledgeContext::KIND_CONTEXT,
                'name' => trim($name),
                'sort_order' => $sortOrder,
            ]);

            return $context->loadCount('children');
        }, 3);
    }
}
