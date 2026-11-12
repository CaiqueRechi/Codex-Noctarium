<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\ContextPath;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Http\JsonResponse;

final class ShowEntityPathController
{
    // RF-09: where a note sits, from its universe down, so the canvas can
    // travel to it through the nearest common ancestor.
    public function __invoke(string $entity, ContextPath $contextPath, Repository $config): JsonResponse
    {
        $note = KnowledgeEntity::query()
            ->whereKey($entity)
            ->where('vault_id', (string) $config->get('crow-vault-canvas.vault.id'))
            ->firstOrFail();

        return response()->json(['path' => $contextPath->toEntity($note)]);
    }
}
