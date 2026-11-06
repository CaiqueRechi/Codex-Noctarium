<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Versions;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use Illuminate\Support\Facades\DB;

final class CaptureVaultSnapshot
{
    /** @return array<string, mixed> */
    public function handle(Perspective $perspective): array
    {
        $vaultId = (string) $perspective->vault_id;
        $entities = KnowledgeEntity::query()
            ->with('document')
            ->where('vault_id', $vaultId)
            ->orderBy('id')
            ->get();
        $memberships = DB::table('cvc_context_entity')
            ->join('cvc_contexts', 'cvc_contexts.id', '=', 'cvc_context_entity.context_id')
            ->join('cvc_entities', 'cvc_entities.id', '=', 'cvc_context_entity.entity_id')
            ->where('cvc_contexts.vault_id', $vaultId)
            ->where('cvc_entities.vault_id', $vaultId)
            ->whereNull('cvc_contexts.deleted_at')
            ->whereNull('cvc_entities.deleted_at')
            ->orderBy('cvc_context_entity.context_id')
            ->orderBy('cvc_context_entity.entity_id')
            ->select([
                'cvc_context_entity.context_id',
                'cvc_context_entity.entity_id',
                'cvc_context_entity.position_x',
                'cvc_context_entity.position_y',
                'cvc_context_entity.is_pinned',
            ])
            ->get();
        $layoutOverrides = $perspective->layouts()
            ->orderBy('context_id')
            ->orderBy('entity_id')
            ->get()
            ->keyBy(fn ($layout): string => "{$layout->context_id}:{$layout->entity_id}");
        $relations = KnowledgeRelation::query()
            ->where('vault_id', $vaultId)
            ->orderBy('id')
            ->get();

        return [
            'schema_version' => 1,
            'vault_id' => $vaultId,
            'perspective' => [
                'id' => (string) $perspective->getKey(),
                'name' => $perspective->name,
                'source_perspective_id' => $perspective->source_perspective_id,
                'filters' => $perspective->filters,
                'layouts' => $memberships->map(function (object $membership) use ($layoutOverrides): array {
                    $layout = $layoutOverrides->get("{$membership->context_id}:{$membership->entity_id}")
                        ?? $membership;

                    return [
                        'context_id' => $membership->context_id,
                        'entity_id' => $membership->entity_id,
                        'position_x' => $layout->position_x === null ? null : (float) $layout->position_x,
                        'position_y' => $layout->position_y === null ? null : (float) $layout->position_y,
                        'is_pinned' => (bool) $layout->is_pinned,
                    ];
                })->values()->all(),
            ],
            'entities' => $entities->map(fn (KnowledgeEntity $entity): array => [
                'id' => (string) $entity->getKey(),
                'kind' => $entity->kind,
                'title' => $entity->title,
                'entity_type' => $entity->entity_type,
                'properties' => $entity->properties ?? [],
                'tags' => $entity->tags ?? [],
                'document' => $entity->document === null
                    ? null
                    : [
                        'storage_path' => $entity->document->storage_path,
                        'revision' => $entity->document->revision,
                        'content_hash' => $entity->document->content_hash,
                    ],
            ])->values()->all(),
            'context_entities' => $memberships->map(fn (object $membership): array => [
                'context_id' => $membership->context_id,
                'entity_id' => $membership->entity_id,
                'position_x' => $membership->position_x === null ? null : (float) $membership->position_x,
                'position_y' => $membership->position_y === null ? null : (float) $membership->position_y,
                'is_pinned' => (bool) $membership->is_pinned,
            ])->values()->all(),
            'relations' => $relations->map(fn (KnowledgeRelation $relation): array => [
                'id' => (string) $relation->getKey(),
                'source_entity_id' => $relation->source_entity_id,
                'target_entity_id' => $relation->target_entity_id,
                'context_id' => $relation->context_id,
                'relation_type' => $relation->relation_type,
                'is_directed' => $relation->is_directed,
                'properties' => $relation->properties ?? [],
            ])->values()->all(),
        ];
    }
}
