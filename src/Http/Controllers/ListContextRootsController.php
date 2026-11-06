<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\OpenContextSlice;
use CrowVaultCanvas\Http\ContextPresenter;
use Illuminate\Http\JsonResponse;

final class ListContextRootsController
{
    public function __invoke(OpenContextSlice $openContextSlice, ContextPresenter $presenter): JsonResponse
    {
        return response()->json([
            'slice' => $presenter->slice($openContextSlice->handle()),
        ]);
    }
}
