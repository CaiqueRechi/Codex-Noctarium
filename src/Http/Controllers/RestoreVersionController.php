<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Versions\RestoreVaultVersion;
use CrowVaultCanvas\Http\VersionPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RestoreVersionController
{
    public function __invoke(
        Request $request,
        RestoreVaultVersion $restoreVersion,
        VersionPresenter $presenter,
        string $version,
    ): JsonResponse {
        $userId = (string) $request->user()?->getAuthIdentifier();
        abort_if($userId === '', 401);
        $restoration = $restoreVersion->handle($version, $userId);

        return response()->json([
            'restoredVersion' => $presenter->toArray($restoration->restoredVersion),
            'recoveryVersion' => $presenter->toArray($restoration->recoveryVersion),
        ]);
    }
}
