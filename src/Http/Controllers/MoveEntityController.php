<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\MoveEntity;
use CrowVaultCanvas\Http\Requests\MoveEntityRequest;
use Illuminate\Http\Response;

final class MoveEntityController
{
    public function __invoke(MoveEntityRequest $request, MoveEntity $moveEntity, string $entity): Response
    {
        $moveEntity->handle(
            $entity,
            (string) $request->validated('from_context_id'),
            (string) $request->validated('to_context_id'),
        );

        return response()->noContent();
    }
}
