<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Entities\RenameEntity;
use CrowVaultCanvas\Http\Requests\RenameEntityRequest;
use Illuminate\Http\JsonResponse;

final class RenameEntityController
{
    public function __invoke(
        RenameEntityRequest $request,
        RenameEntity $renameEntity,
        string $entity,
    ): JsonResponse {
        $renamed = $renameEntity->handle($entity, (string) $request->validated('title'));

        return response()->json([
            'entity' => [
                'id' => (string) $renamed->getKey(),
                'title' => $renamed->title,
            ],
        ]);
    }
}
