<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Relations\DeleteRelation;
use Illuminate\Http\Response;

final class DestroyRelationController
{
    public function __invoke(string $relation, DeleteRelation $deleteRelation): Response
    {
        $deleteRelation->handle($relation);

        return response()->noContent();
    }
}
