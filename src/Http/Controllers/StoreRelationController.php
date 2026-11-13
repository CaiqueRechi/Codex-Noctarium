<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Http\RelationPresenter;
use CrowVaultCanvas\Http\Requests\StoreRelationRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreRelationController
{
    public function __invoke(
        StoreRelationRequest $request,
        CreateRelation $createRelation,
        RelationPresenter $presenter,
    ): JsonResponse {
        /** @var array<string, bool|float|int|string|null> $properties */
        $properties = $request->validated('properties');
        $relation = $createRelation->handle(
            $request->validated('source_entity_id'),
            $request->validated('target_entity_id'),
            $request->validated('context_id'),
            $request->validated('type'),
            $request->boolean('directed'),
            $properties,
        );

        return response()->json([
            'relation' => $presenter->relation($relation),
        ], Response::HTTP_CREATED);
    }
}
