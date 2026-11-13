<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Entities\PaintEntity;
use CrowVaultCanvas\Domain\Knowledge\NoteColor;
use CrowVaultCanvas\Http\Requests\PaintEntityRequest;
use Illuminate\Http\JsonResponse;

final class PaintEntityController
{
    public function __invoke(PaintEntityRequest $request, PaintEntity $paintEntity, string $entity): JsonResponse
    {
        $color = $request->validated('color');
        $painted = $paintEntity->handle($entity, is_string($color) ? NoteColor::from($color) : null);

        return response()->json([
            'entity' => [
                'id' => (string) $painted->getKey(),
                'color' => $painted->color,
            ],
        ]);
    }
}
