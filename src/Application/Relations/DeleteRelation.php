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
            $relation = KnowledgeRelation::query()
                ->whereKey($relationId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->firstOrFail();
            $entities = KnowledgeEntity::query()
                ->where('vault_id', $relation->vault_id)
                ->whereKey([$relation->source_entity_id, $relation->target_entity_id])
                ->lockForUpdate()
                ->get();

            $relation->delete();
            $entities->each(fn (KnowledgeEntity $entity) => $entity->advanceSearchVersion());

            return $relation;
        }, 3);

        IndexKnowledgeEntity::dispatch($relation->source_entity_id)->afterCommit();
        IndexKnowledgeEntity::dispatch($relation->target_entity_id)->afterCommit();
    }
}
