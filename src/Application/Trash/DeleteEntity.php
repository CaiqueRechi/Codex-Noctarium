<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;

final class DeleteEntity
{
    public function handle(string $entityId): EntityDeletion
    {
        [$deletion, $entitiesToIndex] = DB::transaction(function () use ($entityId): array {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', $vaultId)
                ->firstOrFail();
            $relations = KnowledgeRelation::query()
                ->where('vault_id', $vaultId)
                ->where(function ($query) use ($entityId): void {
                    $query->where('source_entity_id', $entityId)
                        ->orWhere('target_entity_id', $entityId);
                })
                ->get();
            $entityIds = $relations
                ->flatMap(fn (KnowledgeRelation $relation): array => [
                    $relation->source_entity_id,
                    $relation->target_entity_id,
                ])
                ->push($entityId)
                ->unique()
                ->sort()
                ->values();
            $lockedEntities = KnowledgeEntity::query()
                ->where('vault_id', $vaultId)
                ->whereKey($entityIds->all())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy(fn (KnowledgeEntity $candidate): string => (string) $candidate->getKey());
            $entity = $lockedEntities->get($entityId) ?? abort(404);
            $relations = KnowledgeRelation::query()
                ->whereKey($relations->modelKeys())
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($relations as $relation) {
                $relation->forceFill(['cascade_deleted_by_entity_id' => $entityId])->save();
                $relation->delete();
            }

            MarkdownDocument::query()->whereKey($entityId)->delete();
            $lockedEntities->each(fn (KnowledgeEntity $candidate) => $candidate->advanceSearchVersion());
            $entity->delete();
            $entity->load(['contexts']);

            return [
                new EntityDeletion(
                    $entity,
                    $relations->modelKeys(),
                ),
                $lockedEntities->keys()->all(),
            ];
        }, 3);

        foreach ($entitiesToIndex as $indexedEntityId) {
            IndexKnowledgeEntity::dispatch($indexedEntityId)->afterCommit();
        }

        return $deletion;
    }
}
