<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Infrastructure\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class LocalAttachmentStorage implements AttachmentStorage
{
    public function store(
        UploadedFile $file,
        string $vaultId,
        string $entityId,
        string $attachmentId,
        string $extension,
    ): StoredAttachment {
        $this->assertUuid($vaultId, 'vault');
        $this->assertUuid($entityId, 'entity');
        $this->assertUuid($attachmentId, 'attachment');

        if (! in_array($extension, ['gif', 'jpg', 'pdf', 'png', 'webp'], true)) {
            throw new InvalidArgumentException('The attachment extension is not allowed.');
        }

        $storagePath = "vaults/{$vaultId}/entities/{$entityId}/attachments/{$attachmentId}.{$extension}";
        $absolutePath = $this->absolutePath($storagePath);
        $directory = dirname($absolutePath);

        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('The private attachment directory could not be created.');
        }

        $this->assertDirectoryWithinRoot($directory);
        $source = fopen((string) $file->getRealPath(), 'rb');
        $destination = fopen($absolutePath, 'xb');

        if ($source === false || $destination === false) {
            is_resource($source) && fclose($source);
            is_resource($destination) && fclose($destination);
            @unlink($absolutePath);

            throw new RuntimeException('The attachment could not be created.');
        }

        try {
            if (! flock($destination, LOCK_EX)) {
                throw new RuntimeException('The attachment could not be locked.');
            }

            $copiedBytes = stream_copy_to_stream($source, $destination);

            if ($copiedBytes === false || $copiedBytes !== $file->getSize()) {
                throw new RuntimeException('The attachment could not be written completely.');
            }

            if (! fflush($destination) || ! fsync($destination)) {
                throw new RuntimeException('The attachment could not be flushed durably.');
            }

            flock($destination, LOCK_UN);
        } catch (\Throwable $exception) {
            fclose($source);
            fclose($destination);
            @unlink($absolutePath);

            throw $exception;
        }

        fclose($source);
        fclose($destination);
        @chmod($absolutePath, 0600);

        return new StoredAttachment($storagePath);
    }

    public function open(
        string $vaultId,
        string $entityId,
        string $storagePath,
        string $expectedHash,
    ) {
        $absolutePath = $this->resolveOwnedFile($vaultId, $entityId, $storagePath);
        $actualHash = hash_file('sha256', $absolutePath);

        if ($actualHash === false || ! hash_equals($expectedHash, $actualHash)) {
            throw new RuntimeException('The attachment failed its integrity check.');
        }

        $stream = fopen($absolutePath, 'rb');

        if ($stream === false) {
            throw new RuntimeException('The attachment could not be opened.');
        }

        return $stream;
    }

    public function delete(string $vaultId, string $entityId, string $storagePath): void
    {
        $absolutePath = $this->resolveOwnedFile($vaultId, $entityId, $storagePath);

        if (! unlink($absolutePath)) {
            throw new RuntimeException('The attachment could not be removed after a failed write.');
        }
    }

    private function resolveOwnedFile(string $vaultId, string $entityId, string $storagePath): string
    {
        $this->assertUuid($vaultId, 'vault');
        $this->assertUuid($entityId, 'entity');
        $this->assertOwnedStoragePath($vaultId, $entityId, $storagePath);
        $root = realpath($this->root());
        $file = realpath($this->absolutePath($storagePath));

        if ($root === false || $file === false || ! str_starts_with($file, $root.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('The attachment is unavailable.');
        }

        return $file;
    }

    private function assertOwnedStoragePath(string $vaultId, string $entityId, string $storagePath): void
    {
        $parts = explode('/', $storagePath);
        $matchesAttachment = isset($parts[5])
            && preg_match('/^[0-9a-f-]{36}\.(gif|jpg|pdf|png|webp)$/D', $parts[5]) === 1;

        if (count($parts) !== 6
            || $parts[0] !== 'vaults'
            || ! hash_equals($vaultId, $parts[1])
            || $parts[2] !== 'entities'
            || ! hash_equals($entityId, $parts[3])
            || $parts[4] !== 'attachments'
            || ! $matchesAttachment) {
            throw new InvalidArgumentException('The attachment path is outside its entity boundary.');
        }
    }

    private function absolutePath(string $storagePath): string
    {
        return $this->root().DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $storagePath);
    }

    private function assertDirectoryWithinRoot(string $directory): void
    {
        $root = realpath($this->root());
        $resolvedDirectory = realpath($directory);

        if ($root === false
            || $resolvedDirectory === false
            || ! str_starts_with($resolvedDirectory, $root.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('The attachment directory escaped the private storage root.');
        }
    }

    private function root(): string
    {
        $root = rtrim((string) config('crow-vault-canvas.storage.root'), '\\/');

        if ($root === '') {
            throw new RuntimeException('The private attachment root is not configured.');
        }

        return $root;
    }

    private function assertUuid(string $value, string $label): void
    {
        if (! Str::isUuid($value)) {
            throw new InvalidArgumentException("The {$label} identifier must be a UUID.");
        }
    }
}
