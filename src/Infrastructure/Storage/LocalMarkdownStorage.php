<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Infrastructure\Storage;

use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class LocalMarkdownStorage implements MarkdownStorage
{
    public function writeRevision(
        string $vaultId,
        string $entityId,
        int $revision,
        string $content,
    ): StoredMarkdown {
        $this->assertUuid($vaultId, 'vault');
        $this->assertUuid($entityId, 'entity');

        if ($revision < 1) {
            throw new InvalidArgumentException('The document revision must be positive.');
        }

        $writeId = (string) Str::uuid();
        $storagePath = "vaults/{$vaultId}/entities/{$entityId}/revisions/{$revision}-{$writeId}.md";
        $absolutePath = $this->absolutePath($storagePath);
        $directory = dirname($absolutePath);

        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('The private Markdown directory could not be created.');
        }

        $this->assertDirectoryWithinRoot($directory);
        $handle = fopen($absolutePath, 'xb');

        if ($handle === false) {
            throw new RuntimeException('The Markdown revision could not be created.');
        }

        try {
            if (! flock($handle, LOCK_EX)) {
                throw new RuntimeException('The Markdown revision could not be locked.');
            }

            $this->writeAll($handle, $content);

            if (! fflush($handle) || ! fsync($handle)) {
                throw new RuntimeException('The Markdown revision could not be flushed durably.');
            }

            flock($handle, LOCK_UN);
        } catch (\Throwable $exception) {
            fclose($handle);
            @unlink($absolutePath);

            throw $exception;
        }

        fclose($handle);
        @chmod($absolutePath, 0600);

        return new StoredMarkdown($storagePath, hash('sha256', $content));
    }

    public function read(string $vaultId, string $entityId, string $storagePath): string
    {
        $this->assertUuid($vaultId, 'vault');
        $this->assertUuid($entityId, 'entity');
        $this->assertOwnedStoragePath($vaultId, $entityId, $storagePath);

        $absolutePath = $this->absolutePath($storagePath);
        $root = realpath($this->root());
        $file = realpath($absolutePath);

        if ($root === false || $file === false || ! str_starts_with($file, $root.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('The Markdown revision is unavailable.');
        }

        $content = file_get_contents($file);

        if ($content === false) {
            throw new RuntimeException('The Markdown revision could not be read.');
        }

        return $content;
    }

    /** @param resource $handle */
    private function writeAll($handle, string $content): void
    {
        $offset = 0;
        $length = strlen($content);

        while ($offset < $length) {
            $written = fwrite($handle, substr($content, $offset));

            if ($written === false || $written === 0) {
                throw new RuntimeException('The Markdown revision could not be written completely.');
            }

            $offset += $written;
        }
    }

    private function assertOwnedStoragePath(string $vaultId, string $entityId, string $storagePath): void
    {
        $parts = explode('/', $storagePath);
        $matchesRevision = isset($parts[5])
            && preg_match('/^[1-9][0-9]*-[0-9a-f-]{36}\.md$/D', $parts[5]) === 1;

        if (count($parts) !== 6
            || $parts[0] !== 'vaults'
            || ! hash_equals($vaultId, $parts[1])
            || $parts[2] !== 'entities'
            || ! hash_equals($entityId, $parts[3])
            || $parts[4] !== 'revisions'
            || ! $matchesRevision) {
            throw new InvalidArgumentException('The Markdown path is outside its entity boundary.');
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
            throw new RuntimeException('The Markdown directory escaped the private storage root.');
        }
    }

    private function root(): string
    {
        $root = rtrim((string) config('crow-vault-canvas.storage.root'), '\\/');

        if ($root === '') {
            throw new RuntimeException('The private Markdown root is not configured.');
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
