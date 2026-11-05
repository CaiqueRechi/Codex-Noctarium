<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Trash\RestoreEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use Illuminate\Http\JsonResponse;

final class RestoreEntityController
{
    public function __invoke(string $entity, RestoreEntity $restoreEntity): JsonResponse
    {
        $restoration = $restoreEntity->handle($entity);

        return response()->json([
            'entity' => [
                'id' => $restoration->entity->getKey(),
                'title' => $restoration->entity->title,
                'revision' => $restoration->entity->document?->revision,
                'entityType' => $restoration->entity->entity_type,
                'properties' => (object) ($restoration->entity->properties ?? []),
                'tags' => array_values($restoration->entity->tags ?? []),
            ],
            'memberships' => $restoration->entity->contexts->map(fn ($context): array => [
                'contextId' => (string) $context->getKey(),
                'position' => $context->pivot?->position_x === null
                    ? null
                    : [
                        'x' => (float) $context->pivot->position_x,
                        'y' => (float) $context->pivot->position_y,
                    ],
                'isPinned' => (bool) ($context->pivot?->is_pinned ?? false),
            ])->values(),
            'restoredRelations' => $restoration->restoredRelations
                ->map(fn (KnowledgeRelation $relation): array => [
                    'id' => $relation->getKey(),
                    'sourceEntityId' => $relation->source_entity_id,
                    'targetEntityId' => $relation->target_entity_id,
                    'contextId' => $relation->context_id,
                    'relationType' => $relation->relation_type,
                    'isDirected' => $relation->is_directed,
                    'properties' => (object) ($relation->properties ?? []),
                ])->values(),
            'brokenRelations' => $restoration->brokenRelations,
        ]);
    }
}
