<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Perspectives\CreatePerspective;
use CrowVaultCanvas\Http\PerspectivePresenter;
use CrowVaultCanvas\Http\Requests\StorePerspectiveRequest;
use Illuminate\Http\JsonResponse;

final class StorePerspectiveController
{
    public function __invoke(
        StorePerspectiveRequest $request,
        CreatePerspective $createPerspective,
        PerspectivePresenter $presenter,
    ): JsonResponse {
        /** @var array{context_ids: list<string>, entity_types: list<string>} $filters */
        $filters = $request->validated('filters');
        $perspective = $createPerspective->handle(
            (string) $request->validated('name'),
            $request->validated('source_perspective_id'),
            $filters,
        );

        return response()->json([
            'perspective' => $presenter->toArray($perspective),
        ], 201);
    }
}
