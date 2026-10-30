<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Documents\OpenDocument;
use Illuminate\Http\JsonResponse;

final class ShowDocumentController
{
    public function __invoke(string $entity, OpenDocument $openDocument): JsonResponse
    {
        return response()->json([
            'document' => $openDocument->handle($entity)->toArray(),
        ]);
    }
}
