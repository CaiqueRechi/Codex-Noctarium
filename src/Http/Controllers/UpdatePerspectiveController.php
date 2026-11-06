<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Perspectives\UpdatePerspective;
use CrowVaultCanvas\Http\PerspectivePresenter;
use CrowVaultCanvas\Http\Requests\UpdatePerspectiveRequest;
use Illuminate\Http\JsonResponse;

final class UpdatePerspectiveController
{
    public function __invoke(
        UpdatePerspectiveRequest $request,
        UpdatePerspective $updatePerspective,
        PerspectivePresenter $presenter,
        string $perspective,
    ): JsonResponse {
        /** @var array{context_ids: list<string>, entity_types: list<string>} $filters */
        $filters = $request->validated('filters');
        $updated = $updatePerspective->handle(
            $perspective,
            (string) $request->validated('name'),
            $filters,
        );

        return response()->json([
            'perspective' => $presenter->toArray($updated),
        ]);
    }
}
