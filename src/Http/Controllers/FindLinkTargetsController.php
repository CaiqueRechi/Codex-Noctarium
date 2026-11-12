<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Relations\FindLinkTargets;
use CrowVaultCanvas\Http\Requests\FindLinkTargetsRequest;
use Illuminate\Http\JsonResponse;

final class FindLinkTargetsController
{
    public function __invoke(FindLinkTargetsRequest $request, FindLinkTargets $findLinkTargets): JsonResponse
    {
        $except = $request->validated('except');

        return response()->json([
            'targets' => $findLinkTargets->handle(
                (string) $request->validated('prefix'),
                is_string($except) ? $except : null,
            ),
        ]);
    }
}
