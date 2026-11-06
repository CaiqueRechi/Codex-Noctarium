<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\AttachEntityToContext;
use CrowVaultCanvas\Http\Requests\AttachEntityToContextRequest;
use Illuminate\Http\JsonResponse;

final class AttachEntityToContextController
{
    public function __invoke(
        AttachEntityToContextRequest $request,
        AttachEntityToContext $attachEntityToContext,
        string $context,
    ): JsonResponse {
        $attachEntityToContext->handle(
            $context,
            $request->validated('entity_id'),
        );

        return response()->json(['attached' => true]);
    }
}
