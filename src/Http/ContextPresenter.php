<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http;

use CrowVaultCanvas\Application\Attachments\AttachmentSummary;
use CrowVaultCanvas\Application\Contexts\ContextSlice;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;

final class ContextPresenter
{
    /** @return array{contexts: list<array<string, mixed>>, breadcrumbs: list<array{id: string, name: string}>} */
    public function slice(ContextSlice $slice): array
    {
        return [
            'contexts' => $slice->contexts
                ->map(fn (KnowledgeContext $context): array => $this->context($context))
                ->values()
                ->all(),
            'breadcrumbs' => $slice->breadcrumbs
                ->map(fn (KnowledgeContext $context): array => [
                    'id' => (string) $context->getKey(),
                    'name' => $context->name,
                ])
                ->values()
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function context(KnowledgeContext $context): array
    {
        return [
            'id' => (string) $context->getKey(),
            'parentId' => $context->parent_id,
            'kind' => $context->kind,
            'name' => $context->name,
            'hasChildren' => (int) ($context->children_count ?? 0) > 0,
            'documents' => $context->relationLoaded('entities')
                ? $context->entities
                    ->map(fn (KnowledgeEntity $entity): array => $this->document($entity))
                    ->values()
                    ->all()
                : [],
            'contexts' => $context->relationLoaded('children')
                ? $context->children
                    ->map(fn (KnowledgeContext $child): array => $this->context($child))
                    ->values()
                    ->all()
                : [],
        ];
    }

    /** @return array<string, mixed> */
    private function document(KnowledgeEntity $entity): array
    {
        return [
            'id' => (string) $entity->getKey(),
            'title' => $entity->title,
            'revision' => $entity->document?->revision,
            'entityType' => $entity->entity_type,
            'properties' => (object) ($entity->properties ?? []),
            'tags' => array_values($entity->tags ?? []),
            'attachments' => $entity->attachments
                ->map(fn ($attachment): array => AttachmentSummary::fromModel($attachment)->toArray())
                ->values()
                ->all(),
            'position' => $entity->pivot?->position_x === null
                ? null
                : [
                    'x' => (float) $entity->pivot->position_x,
                    'y' => (float) $entity->pivot->position_y,
                ],
            'isPinned' => (bool) ($entity->pivot?->is_pinned ?? false),
        ];
    }
}
