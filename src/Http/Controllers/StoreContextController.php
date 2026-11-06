<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Http\ContextPresenter;
use CrowVaultCanvas\Http\Requests\StoreContextRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreContextController
{
    public function __invoke(
        StoreContextRequest $request,
        CreateContext $createContext,
        ContextPresenter $presenter,
    ): JsonResponse {
        $context = $createContext->handle(
            (string) $request->validated('name'),
            $request->validated('parent_id'),
        );

        return response()->json([
            'context' => $presenter->context($context),
        ], Response::HTTP_CREATED);
    }
}
