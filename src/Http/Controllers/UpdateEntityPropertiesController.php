<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Entities\UpdateEntityProperties;
use CrowVaultCanvas\Http\Requests\UpdateEntityPropertiesRequest;
use Illuminate\Http\JsonResponse;

final class UpdateEntityPropertiesController
{
    public function __invoke(
        UpdateEntityPropertiesRequest $request,
        UpdateEntityProperties $updateEntityProperties,
        string $entity,
    ): JsonResponse {
        /** @var array<string, bool|float|int|string|null> $properties */
        $properties = $request->validated('properties');
        $updatedEntity = $updateEntityProperties->handle(
            $entity,
            $request->validated('type'),
            $properties,
        );

        return response()->json([
            'entity' => [
                'id' => $updatedEntity->getKey(),
                'title' => $updatedEntity->title,
                'entityType' => $updatedEntity->entity_type,
                'properties' => (object) ($updatedEntity->properties ?? []),
                'revision' => $updatedEntity->document?->revision,
            ],
        ]);
    }
}
