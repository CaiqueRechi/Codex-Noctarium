<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Attachments\AttachmentSummary;
use CrowVaultCanvas\Application\Trash\RestoreEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Http\RelationPresenter;
use Illuminate\Http\JsonResponse;

final class RestoreEntityController
{
    public function __invoke(string $entity, RestoreEntity $restoreEntity, RelationPresenter $presenter): JsonResponse
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
                'attachments' => $restoration->entity->attachments
                    ->map(fn ($attachment): array => AttachmentSummary::fromModel($attachment)->toArray())
                    ->values(),
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
                ->map(fn (KnowledgeRelation $relation): array => $presenter->relation($relation))
                ->values(),
            'brokenRelations' => $restoration->brokenRelations,
        ]);
    }
}
