<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Workspace\SaveWorkspaceState;
use CrowVaultCanvas\Http\Requests\UpdateWorkspaceStateRequest;
use Illuminate\Http\JsonResponse;

final class UpdateWorkspaceStateController
{
    public function __invoke(
        UpdateWorkspaceStateRequest $request,
        SaveWorkspaceState $saveWorkspaceState,
    ): JsonResponse {
        $userId = (string) $request->user()?->getAuthIdentifier();
        abort_if($userId === '', 401);

        return response()->json([
            'workspace' => $saveWorkspaceState->handle(
                $userId,
                (float) $request->validated('viewport.x'),
                (float) $request->validated('viewport.y'),
                (float) $request->validated('viewport.zoom'),
                $request->validated('focus_entity_id'),
                $request->validated('perspective_id'),
                $request->validated('focus_context_id'),
            )->toArray(),
        ]);
    }
}
