<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Contexts\EnsureContextDocument;
use Illuminate\Http\JsonResponse;

final class StoreContextDocumentController
{
    public function __invoke(string $context, EnsureContextDocument $ensureContextDocument): JsonResponse
    {
        return new JsonResponse(['document' => $ensureContextDocument->handle($context)->toArray()]);
    }
}
