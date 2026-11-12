<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;

final class RelationPresenter
{
    /** @return array{id: mixed, sourceEntityId: string, targetEntityId: string, contextId: string|null, relationType: string|null, isDirected: bool, properties: object} */
    public function relation(KnowledgeRelation $relation): array
    {
        return [
            'id' => $relation->getKey(),
            'sourceEntityId' => $relation->source_entity_id,
            'targetEntityId' => $relation->target_entity_id,
            'contextId' => $relation->context_id,
            'relationType' => $relation->relation_type,
            'isDirected' => $relation->is_directed,
            'properties' => (object) ($relation->properties ?? []),
        ];
    }
}
