<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Attachments\AttachmentSummary;
use CrowVaultCanvas\Application\OpenVault;
use CrowVaultCanvas\Application\Workspace\OpenWorkspaceState;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Http\PerspectivePresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class VaultController
{
    public function __invoke(
        Request $request,
        OpenVault $openVault,
        OpenWorkspaceState $openWorkspaceState,
        PerspectivePresenter $perspectivePresenter,
    ): Response {
        $userId = (string) $request->user()?->getAuthIdentifier();
        abort_if($userId === '', 401);
        $vault = $openVault->handle();
        $trash = KnowledgeEntity::onlyTrashed()
            ->where('vault_id', (string) $vault->getKey())
            ->latest('deleted_at')
            ->get();

        return Inertia::render('cvc/vault', [
            'vault' => [
                'id' => $vault->getKey(),
                'name' => $vault->name,
                'universes' => $vault->universes->map(fn (KnowledgeContext $universe): array => [
                    'id' => $universe->getKey(),
                    'name' => $universe->name,
                    'contexts' => $universe->children->map(fn (KnowledgeContext $context): array => [
                        'id' => $context->getKey(),
                        'name' => $context->name,
                        'documents' => $context->entities->map(fn (KnowledgeEntity $entity): array => [
                            'id' => $entity->getKey(),
                            'title' => $entity->title,
                            'revision' => $entity->document?->revision,
                            'entityType' => $entity->entity_type,
                            'properties' => (object) ($entity->properties ?? []),
                            'tags' => array_values($entity->tags ?? []),
                            'attachments' => $entity->attachments
                                ->map(fn ($attachment): array => AttachmentSummary::fromModel($attachment)->toArray())
                                ->values(),
                            'position' => $entity->pivot?->position_x === null
                                ? null
                                : [
                                    'x' => (float) $entity->pivot->position_x,
                                    'y' => (float) $entity->pivot->position_y,
                                ],
                            'isPinned' => (bool) ($entity->pivot?->is_pinned ?? false),
                        ])->values(),
                    ])->values(),
                ])->values(),
                'relations' => $vault->relations->map(fn (KnowledgeRelation $relation): array => [
                    'id' => $relation->getKey(),
                    'sourceEntityId' => $relation->source_entity_id,
                    'targetEntityId' => $relation->target_entity_id,
                    'contextId' => $relation->context_id,
                    'relationType' => $relation->relation_type,
                    'isDirected' => $relation->is_directed,
                    'properties' => (object) ($relation->properties ?? []),
                ])->values(),
                'perspectives' => $vault->perspectives
                    ->map(fn ($perspective): array => $perspectivePresenter->toArray($perspective))
                    ->values(),
                'trash' => $trash->map(fn (KnowledgeEntity $entity): array => [
                    'id' => $entity->getKey(),
                    'title' => $entity->title,
                    'deletedAt' => $entity->deleted_at?->toAtomString(),
                ])->values(),
            ],
            'workspace' => $openWorkspaceState->handle($userId)->toArray(),
            'endpoints' => [
                'documents' => route('cvc.documents.store'),
                'entities' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/entities'),
                'contexts' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/contexts'),
                'relations' => route('cvc.relations.store'),
                'perspectives' => route('cvc.perspectives.store'),
                'versions' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/versions'),
                'search' => route('cvc.search'),
                'attachments' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/attachments'),
                'trash' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/trash'),
                'workspace' => route('cvc.workspace.update'),
            ],
        ]);
    }
}
