<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Contexts\OpenContextSlice;
use CrowVaultCanvas\Http\ContextPresenter;
use Illuminate\Http\JsonResponse;

final class StoreNoteSpaceController
{
    public function __invoke(
        string $entity,
        EnsureNoteSpace $ensureNoteSpace,
        OpenContextSlice $openContextSlice,
        ContextPresenter $presenter,
    ): JsonResponse {
        $space = $ensureNoteSpace->handle($entity);

        return new JsonResponse([
            'spaceId' => (string) $space->getKey(),
            'slice' => $presenter->slice($openContextSlice->handle((string) $space->getKey())),
        ]);
    }
}
