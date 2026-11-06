<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Attachments\AttachmentSummary;
use CrowVaultCanvas\Application\Attachments\CreateAttachment;
use CrowVaultCanvas\Http\Requests\StoreAttachmentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

final class StoreAttachmentController
{
    public function __invoke(
        StoreAttachmentRequest $request,
        string $entity,
        CreateAttachment $createAttachment,
    ): JsonResponse {
        $file = $request->file('file');
        abort_unless($file instanceof UploadedFile, 422);
        $attachment = $createAttachment->handle($entity, $file);

        return response()->json([
            'attachment' => AttachmentSummary::fromModel($attachment)->toArray(),
        ], Response::HTTP_CREATED);
    }
}
