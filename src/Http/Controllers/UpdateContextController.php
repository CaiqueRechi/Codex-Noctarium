<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\UpdateContext;
use CrowVaultCanvas\Http\ContextPresenter;
use CrowVaultCanvas\Http\Requests\UpdateContextRequest;
use Illuminate\Http\JsonResponse;

final class UpdateContextController
{
    public function __invoke(UpdateContextRequest $request, string $context, UpdateContext $update, ContextPresenter $presenter): JsonResponse
    {
        $updated = $update->handle($context, (string) $request->validated('name'), $request->validated('parent_id'));

        return response()->json(['context' => $presenter->context($updated)]);
    }
}
