<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Documents\OpenDocument;
use CrowVaultCanvas\Application\Entities\CountNoteUse;
use Illuminate\Http\JsonResponse;

final class ShowDocumentController
{
    public function __invoke(string $entity, OpenDocument $openDocument, CountNoteUse $countNoteUse): JsonResponse
    {
        $document = $openDocument->handle($entity);
        $countNoteUse->access($entity);

        return response()->json([
            'document' => $document->toArray(),
        ]);
    }
}
