<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Relations;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CreateRelation
{
    /** @param array<string, bool|float|int|string|null> $properties */
    public function handle(
        string $sourceEntityId,
        string $targetEntityId,
        ?string $contextId,
        ?string $relationType,
        bool $isDirected,
        array $properties,
    ): KnowledgeRelation {
        $relation = DB::transaction(function () use (
            $sourceEntityId,
            $targetEntityId,
            $contextId,
            $relationType,
            $isDirected,
            $properties,
        ): KnowledgeRelation {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            $entities = KnowledgeEntity::query()
                ->where('vault_id', $vaultId)
                ->whereKey([$sourceEntityId, $targetEntityId])
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy(fn (KnowledgeEntity $entity): string => (string) $entity->getKey());

            if (! $entities->has($sourceEntityId) || ! $entities->has($targetEntityId)) {
                throw ValidationException::withMessages([
                    'target_entity_id' => 'As entidades da relação devem pertencer ao vault aberto.',
                ]);
            }

            if ($contextId !== null) {
                $context = KnowledgeContext::query()
                    ->whereKey($contextId)
                    ->where('vault_id', $vaultId)
                    ->where('kind', KnowledgeContext::KIND_CONTEXT)
                    ->firstOrFail();
                $memberCount = $context->entities()
                    ->whereKey([$sourceEntityId, $targetEntityId])
                    ->count();

                if ($memberCount !== 2) {
                    throw ValidationException::withMessages([
                        'context_id' => 'Uma relação contextual exige as duas entidades no contexto.',
                    ]);
                }
            }

            [$normalizedSource, $normalizedTarget] = $isDirected
                ? [$sourceEntityId, $targetEntityId]
                : collect([$sourceEntityId, $targetEntityId])->sort()->values()->all();
            $duplicate = KnowledgeRelation::query()
                ->where('vault_id', $vaultId)
                ->where('source_entity_id', $normalizedSource)
                ->where('target_entity_id', $normalizedTarget)
                ->where('is_directed', $isDirected)
                ->when(
                    $contextId === null,
                    fn ($query) => $query->whereNull('context_id'),
                    fn ($query) => $query->where('context_id', $contextId),
                )
                ->when(
                    $relationType === null,
                    fn ($query) => $query->whereNull('relation_type'),
                    fn ($query) => $query->where('relation_type', $relationType),
                )
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'target_entity_id' => 'Esta relação já existe.',
                ]);
            }

            $relation = KnowledgeRelation::query()->create([
                'vault_id' => $vaultId,
                'source_entity_id' => $normalizedSource,
                'target_entity_id' => $normalizedTarget,
                'context_id' => $contextId,
                'relation_type' => $relationType,
                'is_directed' => $isDirected,
                'properties' => $properties,
            ]);
            $entities->each(fn (KnowledgeEntity $entity) => $entity->advanceSearchVersion());

            return $relation;
        }, 3);

        IndexKnowledgeEntity::dispatch($relation->source_entity_id)->afterCommit();
        IndexKnowledgeEntity::dispatch($relation->target_entity_id)->afterCommit();

        return $relation;
    }
}
