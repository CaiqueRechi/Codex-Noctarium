<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;

final class RelationPresenter
{
    /** @return array{id: mixed, sourceEntityId: string, targetEntityId: string, sourceTitle: string|null, targetTitle: string|null, contextId: string|null, relationType: string|null, isDirected: bool, properties: object} */
    public function relation(KnowledgeRelation $relation): array
    {
        return [
            'id' => $relation->getKey(),
            'sourceEntityId' => $relation->source_entity_id,
            'targetEntityId' => $relation->target_entity_id,
            // The other end of a relation is often outside the open space,
            // so the page cannot find its title among the notes it holds.
            'sourceTitle' => $relation->source?->title,
            'targetTitle' => $relation->target?->title,
            'contextId' => $relation->context_id,
            'relationType' => $relation->relation_type,
            'isDirected' => $relation->is_directed,
            'properties' => (object) ($relation->properties ?? []),
        ];
    }
}
