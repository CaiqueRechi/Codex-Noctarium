<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Search\SearchVault;
use CrowVaultCanvas\Http\Requests\SearchVaultRequest;
use Illuminate\Http\JsonResponse;

final class SearchVaultController
{
    public function __invoke(SearchVaultRequest $request, SearchVault $searchVault): JsonResponse
    {
        return response()->json([
            'results' => $searchVault->handle(
                (string) $request->validated('q'),
                $request->validated('context_id'),
                $request->validated('entity_type'),
                $request->validated('tag'),
            ),
        ]);
    }
}
