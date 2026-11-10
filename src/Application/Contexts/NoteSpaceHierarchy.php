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

    public function containsCycle(): bool
    {
        $containedBy = [];
        $pendingContainers = [];

        foreach ($this->activeContainments() as [$containerId, $containedId]) {
            $containedBy[$containerId][] = $containedId;
            $pendingContainers[$containedId] = ($pendingContainers[$containedId] ?? 0) + 1;
            $pendingContainers[$containerId] ??= 0;
        }

        $resolvable = array_keys(array_filter($pendingContainers, fn (int $count): bool => $count === 0));
        $resolved = 0;

        while ($resolvable !== []) {
            $contextId = array_pop($resolvable);
            $resolved++;

            foreach ($containedBy[$contextId] ?? [] as $containedId) {
                if (--$pendingContainers[$containedId] === 0) {
                    $resolvable[] = $containedId;
                }
            }
        }

        return $resolved !== count($pendingContainers);
    }

    /** @return list<array{0: string, 1: string}> */
    private function activeContainments(): array
    {
        $vaultId = (string) $this->config->get('crow-vault-canvas.vault.id');
        $nested = KnowledgeContext::query()->where('vault_id', $vaultId)
            ->whereNotNull('parent_id')->get(['id', 'parent_id'])
            ->map(fn (KnowledgeContext $context): array => [(string) $context->parent_id, (string) $context->getKey()]);
        $owned = $this->database->table('cvc_context_entity')
            ->join('cvc_note_spaces', 'cvc_note_spaces.entity_id', '=', 'cvc_context_entity.entity_id')
            ->join('cvc_entities', 'cvc_entities.id', '=', 'cvc_context_entity.entity_id')
            ->join('cvc_contexts as containers', 'containers.id', '=', 'cvc_context_entity.context_id')
            ->join('cvc_contexts as spaces', 'spaces.id', '=', 'cvc_note_spaces.context_id')
            ->where('cvc_entities.vault_id', $vaultId)
            ->where('cvc_entities.kind', KnowledgeEntity::KIND_DOCUMENT)
            ->whereNull('cvc_entities.deleted_at')
            ->where('containers.vault_id', $vaultId)
            ->whereNull('containers.deleted_at')
            ->where('spaces.vault_id', $vaultId)
            ->whereNull('spaces.deleted_at')
            ->get(['cvc_context_entity.context_id as container_id', 'cvc_note_spaces.context_id as space_id'])
            ->map(fn (object $membership): array => [(string) $membership->container_id, (string) $membership->space_id]);

        return $nested->concat($owned)->values()->all();
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
