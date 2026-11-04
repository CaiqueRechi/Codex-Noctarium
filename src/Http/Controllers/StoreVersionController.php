<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Versions\CreateVaultVersion;
use CrowVaultCanvas\Http\Requests\StoreVersionRequest;
use CrowVaultCanvas\Http\VersionPresenter;
use Illuminate\Http\JsonResponse;

final class StoreVersionController
{
    public function __invoke(
        StoreVersionRequest $request,
        CreateVaultVersion $createVersion,
        VersionPresenter $presenter,
        string $perspective,
    ): JsonResponse {
        $userId = (string) $request->user()?->getAuthIdentifier();
        abort_if($userId === '', 401);
        $version = $createVersion->handle(
            $perspective,
            (string) $request->validated('name'),
            $userId,
        );

        return response()->json([
            'version' => $presenter->toArray($version),
        ], 201);
    }
}
