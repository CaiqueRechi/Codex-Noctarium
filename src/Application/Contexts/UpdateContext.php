<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class UpdateContext
{
    public function __construct(
        private readonly NoteSpaceHierarchy $hierarchy,
        private readonly RequireAvailableContext $requireAvailableContext,
    ) {}

    public function handle(string $contextId, string $name, ?string $parentId): KnowledgeContext
    {
        $updated = DB::transaction(function () use ($contextId, $name, $parentId): KnowledgeContext {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $context = KnowledgeContext::query()->where('vault_id', $vaultId)
                ->whereKey($contextId)->lockForUpdate()->firstOrFail();

            if ($context->kind === KnowledgeContext::KIND_NOTE_SPACE) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Use a ação de mover na participação da nota.',
                ]);
            }

            $this->hierarchy->assertCanMove($contextId, $parentId);
            $ancestorId = $parentId;
            $visited = [];

            while ($ancestorId !== null) {
                if ($ancestorId === $contextId || isset($visited[$ancestorId])) {
                    throw ValidationException::withMessages([
                        'parent_id' => 'Um assunto não pode ser movido para dentro de si ou de um descendente.',
                    ]);
                }

                $visited[$ancestorId] = true;
                $ancestor = KnowledgeContext::query()->where('vault_id', $vaultId)
                    ->whereKey($ancestorId)->firstOrFail();
                $this->requireAvailableContext->handle($ancestor);
                $ancestorId = $ancestor->parent_id;
            }

            if ($context->parent_id !== $parentId) {
                $siblings = KnowledgeContext::query()->where('vault_id', $vaultId);
                $parentId === null ? $siblings->whereNull('parent_id') : $siblings->where('parent_id', $parentId);
                $context->sort_order = ((int) $siblings->max('sort_order')) + 1;
            }

            $context->fill([
                'name' => trim($name),
                'parent_id' => $parentId,
                'kind' => $parentId === null ? KnowledgeContext::KIND_UNIVERSE : KnowledgeContext::KIND_CONTEXT,
            ])->save();

            return $context->loadCount('children');
        }, 3);

        $updated->entities()->chunkById(200, function ($entities): void {
            foreach ($entities as $entity) {
                IndexKnowledgeEntity::dispatchTracked((string) $entity->getKey());
            }
        }, 'cvc_entities.id', 'id');

        return $updated;
    }
}
