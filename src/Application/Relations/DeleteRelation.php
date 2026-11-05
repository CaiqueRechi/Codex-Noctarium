<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Relations;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;

final class DeleteRelation
{
    public function handle(string $relationId): void
    {
        $relation = DB::transaction(function () use ($relationId): KnowledgeRelation {
            $relationSnapshot = KnowledgeRelation::query()
                ->whereKey($relationId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->firstOrFail();
            $entities = KnowledgeEntity::query()
                ->where('vault_id', $relationSnapshot->vault_id)
                ->whereKey([$relationSnapshot->source_entity_id, $relationSnapshot->target_entity_id])
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $relation = KnowledgeRelation::query()
                ->whereKey($relationId)
                ->where('vault_id', $relationSnapshot->vault_id)
                ->lockForUpdate()
                ->firstOrFail();

            $relation->forceFill(['cascade_deleted_by_entity_id' => null])->save();
            $relation->delete();
            $entities->each(fn (KnowledgeEntity $entity) => $entity->advanceSearchVersion());

            return $relation;
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($relation->source_entity_id);
        IndexKnowledgeEntity::dispatchTracked($relation->target_entity_id);
    }
}
