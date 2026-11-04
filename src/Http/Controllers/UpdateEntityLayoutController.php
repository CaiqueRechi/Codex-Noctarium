<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\UpdateEntityLayout;
use CrowVaultCanvas\Http\Requests\UpdateEntityLayoutRequest;
use Illuminate\Http\JsonResponse;

final class UpdateEntityLayoutController
{
    public function __invoke(
        UpdateEntityLayoutRequest $request,
        UpdateEntityLayout $updateEntityLayout,
        string $context,
        string $entity,
    ): JsonResponse {
        $updateEntityLayout->handle(
            $context,
            $entity,
            (float) $request->validated('position.x'),
            (float) $request->validated('position.y'),
            $request->boolean('pinned'),
        );

        return response()->json(['updated' => true]);
    }
}
