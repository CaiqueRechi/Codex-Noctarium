<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\OpenContextSlice;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Http\ContextPresenter;
use Illuminate\Http\JsonResponse;

final class ShowContextController
{
    public function __invoke(
        KnowledgeContext $context,
        OpenContextSlice $openContextSlice,
        ContextPresenter $presenter,
    ): JsonResponse {
        return response()->json([
            'slice' => $presenter->slice($openContextSlice->handle((string) $context->getKey())),
        ]);
    }
}
