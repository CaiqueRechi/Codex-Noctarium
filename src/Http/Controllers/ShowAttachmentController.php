<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Attachments\OpenAttachment;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ShowAttachmentController
{
    public function __invoke(string $attachment, OpenAttachment $openAttachment): StreamedResponse
    {
        $opened = $openAttachment->handle($attachment);

        return response()->streamDownload(
            function () use ($opened): void {
                try {
                    fpassthru($opened->stream);
                } finally {
                    fclose($opened->stream);
                }
            },
            $opened->originalName,
            [
                'Cache-Control' => 'private, no-store',
                'Content-Length' => (string) $opened->sizeBytes,
                'Content-Security-Policy' => "default-src 'none'; sandbox",
                'Content-Type' => $opened->mimeType,
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }
}
