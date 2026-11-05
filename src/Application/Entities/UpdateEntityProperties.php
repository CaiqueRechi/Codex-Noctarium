<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Entities;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;

final class UpdateEntityProperties
{
    /** @param array<string, bool|float|int|string|null> $properties */
    public function handle(
        string $entityId,
        ?string $entityType,
        array $properties,
        ?array $tags = null,
    ): KnowledgeEntity {
        $entity = DB::transaction(function () use ($entityId, $entityType, $properties, $tags): KnowledgeEntity {
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->firstOrFail();

            $attributes = [
                'entity_type' => $entityType,
                'properties' => $properties,
            ];

            if ($tags !== null) {
                $attributes['tags'] = array_values($tags);
            }

            $entity->update($attributes);
            $entity->advanceSearchVersion();

            return $entity->load('document');
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($entityId);

        return $entity;
    }
}
