<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\NoteSpace;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;
use Illuminate\Validation\ValidationException;

final readonly class NoteSpaceHierarchy
{
    public function __construct(private DatabaseManager $database, private Repository $config) {}

    public function assertCanAttach(string $contextId, string $entityId): void
    {
        $space = NoteSpace::query()->whereKey($entityId)->first();

        if ($space !== null && $this->containsContext($space->context_id, $contextId)) {
            throw ValidationException::withMessages([
                'entity_id' => 'Esta participação criaria um ciclo de subnotas.',
            ]);
        }
    }

    public function assertCanMove(string $contextId, ?string $parentId): void
    {
        if ($parentId !== null && $this->containsContext($contextId, $parentId)) {
            throw ValidationException::withMessages([
                'parent_id' => 'Este destino criaria um ciclo de subnotas.',
            ]);
        }
    }

    private function containsContext(string $rootId, string $targetId): bool
    {
        $vaultId = (string) $this->config->get('crow-vault-canvas.vault.id');
        KnowledgeContext::query()->where('vault_id', $vaultId)->whereKey($rootId)->firstOrFail();
        $pending = [$rootId];
        $visited = [];

        while ($pending !== []) {
            $batch = array_values(array_filter(array_splice($pending, 0, 200), fn (string $id): bool => ! isset($visited[$id])));

            if (in_array($targetId, $batch, true)) {
                return true;
            }

            if ($batch === []) {
                continue;
            }

            foreach ($batch as $id) {
                $visited[$id] = true;
            }

            $children = KnowledgeContext::query()->where('vault_id', $vaultId)
                ->whereIn('parent_id', $batch)->pluck('id')->all();
            $memberIds = $this->database->table('cvc_context_entity')->whereIn('context_id', $batch)->select('entity_id');
            $spaces = NoteSpace::query()->whereIn('entity_id', $memberIds)
                ->whereHas('entity', fn ($query) => $query->where('vault_id', $vaultId)->where('kind', KnowledgeEntity::KIND_DOCUMENT))
                ->whereHas('context', fn ($query) => $query->where('vault_id', $vaultId))
                ->pluck('context_id')->all();
            $pending = array_merge($pending, $children, $spaces);
        }

        return false;
    }
}
