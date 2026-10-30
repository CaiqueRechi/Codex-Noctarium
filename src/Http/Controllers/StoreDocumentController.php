<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Http\Requests\StoreDocumentRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreDocumentController
{
    public function __invoke(StoreDocumentRequest $request, CreateDocument $createDocument): JsonResponse
    {
        $document = $createDocument->handle((string) $request->validated('context_id'));

        return response()->json(['document' => $document->toArray()], Response::HTTP_CREATED);
    }
}
