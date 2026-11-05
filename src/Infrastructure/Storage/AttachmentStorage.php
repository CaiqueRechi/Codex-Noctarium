<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Infrastructure\Storage;

use Illuminate\Http\UploadedFile;

interface AttachmentStorage
{
    public function store(
        UploadedFile $file,
        string $vaultId,
        string $entityId,
        string $attachmentId,
        string $extension,
    ): StoredAttachment;

    /** @return resource */
    public function open(
        string $vaultId,
        string $entityId,
        string $storagePath,
        string $expectedHash,
    );

    public function delete(string $vaultId, string $entityId, string $storagePath): void;
}
