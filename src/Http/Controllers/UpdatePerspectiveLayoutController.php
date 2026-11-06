<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Perspectives\UpdatePerspectiveLayout;
use CrowVaultCanvas\Http\Requests\UpdatePerspectiveLayoutRequest;
use Illuminate\Http\JsonResponse;

final class UpdatePerspectiveLayoutController
{
    public function __invoke(
        UpdatePerspectiveLayoutRequest $request,
        UpdatePerspectiveLayout $updateLayout,
        string $perspective,
        string $context,
        string $entity,
    ): JsonResponse {
        $layout = $updateLayout->handle(
            $perspective,
            $context,
            $entity,
            (float) $request->validated('position.x'),
            (float) $request->validated('position.y'),
            (bool) $request->validated('pinned'),
        );

        return response()->json([
            'layout' => [
                'contextId' => $layout->context_id,
                'entityId' => $layout->entity_id,
                'position' => [
                    'x' => $layout->position_x,
                    'y' => $layout->position_y,
                ],
                'isPinned' => $layout->is_pinned,
            ],
        ]);
    }
}
