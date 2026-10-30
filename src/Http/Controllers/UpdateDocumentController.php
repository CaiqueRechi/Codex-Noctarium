<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Documents\DocumentRevisionConflict;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Http\Requests\UpdateDocumentRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class UpdateDocumentController
{
    public function __invoke(
        UpdateDocumentRequest $request,
        string $entity,
        SaveDocument $saveDocument,
    ): JsonResponse {
        try {
            $document = $saveDocument->handle(
                $entity,
                (string) $request->validated('content'),
                $request->integer('revision'),
            );
        } catch (DocumentRevisionConflict $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], Response::HTTP_CONFLICT);
        }

        return response()->json(['document' => $document->toArray()]);
    }
}
