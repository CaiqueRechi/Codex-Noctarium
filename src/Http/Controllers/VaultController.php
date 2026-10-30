<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\OpenVault;
use CrowVaultCanvas\Application\Workspace\OpenWorkspaceState;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class VaultController
{
    public function __invoke(
        Request $request,
        OpenVault $openVault,
        OpenWorkspaceState $openWorkspaceState,
    ): Response {
        $userId = (string) $request->user()?->getAuthIdentifier();
        abort_if($userId === '', 401);
        $vault = $openVault->handle();

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
                        ])->values(),
                    ])->values(),
                ])->values(),
            ],
            'workspace' => $openWorkspaceState->handle($userId)->toArray(),
            'endpoints' => [
                'documents' => route('cvc.documents.store'),
                'workspace' => route('cvc.workspace.update'),
            ],
        ]);
    }
}
