<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Trash\DeleteEntity;
use Illuminate\Http\JsonResponse;

final class DestroyEntityController
{
    public function __invoke(string $entity, DeleteEntity $deleteEntity): JsonResponse
    {
        $deletion = $deleteEntity->handle($entity);

        return response()->json([
            'trashItem' => [
                'id' => $deletion->entity->getKey(),
                'title' => $deletion->entity->title,
                'deletedAt' => $deletion->entity->deleted_at?->toAtomString(),
            ],
            'deletedRelationIds' => $deletion->deletedRelationIds,
        ]);
    }
}
