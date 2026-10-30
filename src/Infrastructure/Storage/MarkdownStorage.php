<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Infrastructure\Storage;

interface MarkdownStorage
{
    public function writeRevision(
        string $vaultId,
        string $entityId,
        int $revision,
        string $content,
    ): StoredMarkdown;

    public function read(string $vaultId, string $entityId, string $storagePath): string;
}
