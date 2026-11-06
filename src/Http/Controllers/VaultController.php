<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\OpenContextSlice;
use CrowVaultCanvas\Application\OpenVault;
use CrowVaultCanvas\Application\Operations\ListOperationalTasks;
use CrowVaultCanvas\Application\Workspace\OpenWorkspaceState;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Http\ContextPresenter;
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
        OpenContextSlice $openContextSlice,
        ContextPresenter $contextPresenter,
        PerspectivePresenter $perspectivePresenter,
        ListOperationalTasks $listOperationalTasks,
    ): Response {
        $userId = (string) $request->user()?->getAuthIdentifier();
        abort_if($userId === '', 401);
        $workspace = $openWorkspaceState->handle($userId);
        $vault = $openVault->handle();
        $contextSlice = $contextPresenter->slice(
            $openContextSlice->handle($workspace->focusContextId),
        );
        $trash = KnowledgeEntity::onlyTrashed()
            ->where('vault_id', (string) $vault->getKey())
            ->latest('deleted_at')
            ->get();

        return Inertia::render('cvc/vault', [
            'vault' => [
                'id' => $vault->getKey(),
                'name' => $vault->name,
                'universes' => $contextSlice['contexts'],
                'breadcrumbs' => $contextSlice['breadcrumbs'],
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
                'operations' => $listOperationalTasks->handle()
                    ->map(fn ($task): array => $task->toArray())
                    ->values(),
            ],
            'workspace' => $workspace->toArray(),
            'endpoints' => [
                'documents' => route('cvc.documents.store'),
                'entities' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/entities'),
                'contexts' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/contexts'),
                'relations' => route('cvc.relations.store'),
                'perspectives' => route('cvc.perspectives.store'),
                'versions' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/versions'),
                'search' => route('cvc.search'),
                'operations' => route('cvc.operations.index'),
                'attachments' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/attachments'),
                'trash' => url('/'.trim((string) config('crow-vault-canvas.route.prefix'), '/').'/trash'),
                'workspace' => route('cvc.workspace.update'),
            ],
        ]);
    }
}
