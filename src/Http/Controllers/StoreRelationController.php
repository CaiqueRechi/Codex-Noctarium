<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Http\Requests\StoreRelationRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreRelationController
{
    public function __invoke(
        StoreRelationRequest $request,
        CreateRelation $createRelation,
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
            'relation' => [
                'id' => $relation->getKey(),
                'sourceEntityId' => $relation->source_entity_id,
                'targetEntityId' => $relation->target_entity_id,
                'contextId' => $relation->context_id,
                'relationType' => $relation->relation_type,
                'isDirected' => $relation->is_directed,
                'properties' => (object) ($relation->properties ?? []),
            ],
        ], Response::HTTP_CREATED);
    }
}
