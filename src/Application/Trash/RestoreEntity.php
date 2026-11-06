<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class RestoreEntity
{
    public function handle(string $entityId): EntityRestoration
    {
        [$restoration, $entitiesToIndex] = DB::transaction(function () use ($entityId): array {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            $trashedEntity = KnowledgeEntity::onlyTrashed()
                ->whereKey($entityId)
                ->where('vault_id', $vaultId)
                ->firstOrFail();
            $relations = KnowledgeRelation::onlyTrashed()
                ->where('vault_id', $vaultId)
                ->whereNotNull('cascade_deleted_by_entity_id')
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
            $entities = KnowledgeEntity::withTrashed()
                ->where('vault_id', $vaultId)
                ->whereKey($entityIds->all())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy(fn (KnowledgeEntity $candidate): string => (string) $candidate->getKey());
            $entity = $entities->get($entityId);

            abort_if($entity === null || ! $entity->trashed(), 404);
            $relations = KnowledgeRelation::onlyTrashed()
                ->whereKey($relations->modelKeys())
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $entity->restore();
            MarkdownDocument::withTrashed()->whereKey($entityId)->first()?->restore();
            $restoredRelations = new Collection;
            $brokenRelations = [];

            foreach ($relations as $relation) {
                $missingEntityIds = collect([
                    $relation->source_entity_id,
                    $relation->target_entity_id,
                ])->filter(fn (string $relatedEntityId): bool => ! $entities->has($relatedEntityId)
                    || $entities->get($relatedEntityId)->trashed()
                )->values()->all();

                if ($missingEntityIds !== []) {
                    $brokenRelations[] = [
                        'id' => (string) $relation->getKey(),
                        'missingEntityIds' => $missingEntityIds,
                    ];

                    continue;
                }

                $relation->forceFill(['cascade_deleted_by_entity_id' => null])->save();
                $relation->restore();
                $restoredRelations->push($relation);
            }

            $entitiesToIndex = $restoredRelations
                ->flatMap(fn (KnowledgeRelation $relation): array => [
                    $relation->source_entity_id,
                    $relation->target_entity_id,
                ])
                ->push($entityId)
                ->unique()
                ->values();
            $entities->only($entitiesToIndex->all())
                ->each(fn (KnowledgeEntity $candidate) => $candidate->advanceSearchVersion());
            $entity->load(['document', 'contexts', 'attachments']);

            return [
                new EntityRestoration($entity, $restoredRelations, $brokenRelations),
                $entitiesToIndex->all(),
            ];
        }, 3);

        foreach ($entitiesToIndex as $indexedEntityId) {
            IndexKnowledgeEntity::dispatchTracked($indexedEntityId);
        }

        return $restoration;
    }
}
