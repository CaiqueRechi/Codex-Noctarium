<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Infrastructure\Storage;

use Closure;
use FilesystemIterator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;

final class StorageQuota
{
    public function store(
        string $vaultId,
        int $additionalBytes,
        string $storagePath,
        string $validationField,
        Closure $writer,
    ): mixed {
        if (! Str::isUuid($vaultId)) {
            throw new InvalidArgumentException('The vault identifier must be a UUID.');
        }

        if ($additionalBytes < 0
            || ! in_array($validationField, ['content', 'file'], true)) {
            throw new InvalidArgumentException('The storage reservation is invalid.');
        }

        $this->assertOwnedStoragePath($vaultId, $storagePath);

        $root = $this->root();
        $vaultDirectory = $root.DIRECTORY_SEPARATOR.'vaults'.DIRECTORY_SEPARATOR.$vaultId;
        $this->ensurePrivateDirectory($root);
        $this->ensurePrivateDirectory($vaultDirectory);
        $this->assertDirectoryWithinRoot($root, $vaultDirectory);
        $lock = fopen($vaultDirectory.DIRECTORY_SEPARATOR.'.quota.lock', 'c+b');

        if ($lock === false) {
            throw new RuntimeException('The vault storage quota could not be locked.');
        }

        try {
            if (! flock($lock, LOCK_EX)) {
                throw new RuntimeException('The vault storage quota could not be locked.');
            }

            $maximumBytes = (int) config('crow-vault-canvas.storage.max_vault_bytes');

            if ($maximumBytes < 1) {
                throw new RuntimeException('The vault storage quota is not configured safely.');
            }

            $minimumFreeBytes = (int) config('crow-vault-canvas.storage.minimum_free_bytes');
            $maximumEntries = (int) config('crow-vault-canvas.storage.max_vault_entries');
            $freeBytes = disk_free_space($root);

            if ($minimumFreeBytes < 0 || $maximumEntries < 1 || $freeBytes === false) {
                throw new RuntimeException('The private storage reserve could not be verified safely.');
            }

            [$usedBytes, $usedEntries] = $this->directoryUsage($vaultDirectory);
            $additionalEntries = $this->additionalEntryCount($root, $storagePath);

            if ($additionalBytes > $maximumBytes
                || $usedBytes > $maximumBytes - $additionalBytes
                || $additionalEntries > $maximumEntries
                || $usedEntries > $maximumEntries - $additionalEntries
                || $additionalBytes > $freeBytes
                || $freeBytes - $additionalBytes < $minimumFreeBytes) {
                throw ValidationException::withMessages([
                    $validationField => 'O vault atingiu o limite de armazenamento configurado.',
                ]);
            }

            return $writer();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** @return array{int, int} */
    private function directoryUsage(string $directory): array
    {
        $bytes = 0;
        $entries = 0;
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($files as $file) {
            if ($entries === PHP_INT_MAX) {
                throw new RuntimeException('The vault storage entries could not be measured safely.');
            }

            $entries++;

            if ($file->isLink() || ! $file->isFile()) {
                continue;
            }

            $size = $file->getSize();

            if ($size < 0 || $bytes > PHP_INT_MAX - $size) {
                throw new RuntimeException('The vault storage usage could not be measured safely.');
            }

            $bytes += $size;
        }

        return [$bytes, $entries];
    }

    private function additionalEntryCount(string $root, string $storagePath): int
    {
        $entries = 0;
        $currentPath = $root;

        foreach (explode('/', $storagePath) as $segment) {
            $currentPath .= DIRECTORY_SEPARATOR.$segment;

            if (! file_exists($currentPath) && ! is_link($currentPath)) {
                $entries++;
            }
        }

        return $entries;
    }

    private function assertOwnedStoragePath(string $vaultId, string $storagePath): void
    {
        $parts = explode('/', $storagePath);

        if (count($parts) < 3
            || $parts[0] !== 'vaults'
            || ! hash_equals($vaultId, $parts[1])) {
            throw new InvalidArgumentException('The storage path is outside its vault boundary.');
        }

        foreach ($parts as $part) {
            if ($part === '' || $part === '.' || $part === '..' || str_contains($part, '\\')) {
                throw new InvalidArgumentException('The storage path is invalid.');
            }
        }
    }

    private function ensurePrivateDirectory(string $directory): void
    {
        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('The private vault directory could not be created.');
        }
    }

    private function assertDirectoryWithinRoot(string $root, string $directory): void
    {
        $resolvedRoot = realpath($root);
        $resolvedDirectory = realpath($directory);

        if ($resolvedRoot === false
            || $resolvedDirectory === false
            || ! str_starts_with($resolvedDirectory, $resolvedRoot.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('The vault storage directory escaped the private root.');
        }
    }

    private function root(): string
    {
        $root = rtrim((string) config('crow-vault-canvas.storage.root'), '\\/');

        if ($root === '') {
            throw new RuntimeException('The private vault root is not configured.');
        }

        return $root;
    }
}
