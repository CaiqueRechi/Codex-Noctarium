<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\DetachEntityFromContext;
use Illuminate\Http\Response;

final class DetachEntityFromContextController
{
    public function __invoke(string $context, string $entity, DetachEntityFromContext $detach): Response
    {
        $detach->handle($context, $entity);

        return response()->noContent();
    }
}
