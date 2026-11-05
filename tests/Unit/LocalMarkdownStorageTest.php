<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Unit;

use CrowVaultCanvas\Infrastructure\Storage\LocalMarkdownStorage;
use CrowVaultCanvas\Infrastructure\Storage\StorageQuota;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

final class LocalMarkdownStorageTest extends TestCase
{
    public function test_it_confines_reads_to_the_expected_vault_and_entity(): void
    {
        $storage = new LocalMarkdownStorage;
        $vaultId = '019a34a8-0c7e-71ec-88ca-c4fb55740101';
        $entityId = '019a34a8-0c7e-71ec-88ca-c4fb55740202';

        $this->expectException(InvalidArgumentException::class);

        $storage->read($vaultId, $entityId, '../../outside.md');
    }

    public function test_it_rejects_untrusted_identifiers_before_touching_the_filesystem(): void
    {
        $storage = new LocalMarkdownStorage;

        $this->expectException(InvalidArgumentException::class);

        $storage->writeRevision('../vault', '019a34a8-0c7e-71ec-88ca-c4fb55740202', 1, 'content');
    }

    public function test_it_rejects_markdown_larger_than_the_configured_item_limit(): void
    {
        config()->set('crow-vault-canvas.storage.max_markdown_bytes', 4);
        $storage = new LocalMarkdownStorage;

        try {
            $storage->writeRevision((string) Str::uuid(), (string) Str::uuid(), 1, '12345');
            self::fail('The oversized Markdown revision should have been rejected.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('content', $exception->errors());
        }
    }

    public function test_it_rejects_cumulative_vault_usage(): void
    {
        $root = storage_path('framework/testing/cvc-quota-'.Str::uuid());
        config()->set('crow-vault-canvas.storage.root', $root);
        config()->set('crow-vault-canvas.storage.max_markdown_bytes', 10);
        config()->set('crow-vault-canvas.storage.max_vault_bytes', 6);
        $storage = new LocalMarkdownStorage;
        $vaultId = (string) Str::uuid();

        try {
            $stored = $storage->writeRevision($vaultId, (string) Str::uuid(), 1, '1234');
            self::assertSame(hash('sha256', '1234'), $stored->contentHash);

            try {
                $storage->writeRevision($vaultId, (string) Str::uuid(), 1, 'abc');
                self::fail('The cumulative storage quota should have been enforced.');
            } catch (ValidationException $exception) {
                self::assertArrayHasKey('content', $exception->errors());
            }
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_it_holds_an_exclusive_vault_lock_while_writing(): void
    {
        $root = storage_path('framework/testing/cvc-lock-'.Str::uuid());
        config()->set('crow-vault-canvas.storage.root', $root);
        config()->set('crow-vault-canvas.storage.max_vault_bytes', 10);
        config()->set('crow-vault-canvas.storage.max_vault_entries', 10);
        config()->set('crow-vault-canvas.storage.minimum_free_bytes', 0);
        $vaultId = (string) Str::uuid();
        $storagePath = "vaults/{$vaultId}/entities/".Str::uuid().'/revisions/1-'.Str::uuid().'.md';

        try {
            $result = app(StorageQuota::class)->store(
                $vaultId,
                1,
                $storagePath,
                'content',
                function () use ($root, $vaultId): string {
                    $secondHandle = fopen("{$root}/vaults/{$vaultId}/.quota.lock", 'c+b');
                    self::assertIsResource($secondHandle);

                    try {
                        self::assertFalse(flock($secondHandle, LOCK_EX | LOCK_NB));
                    } finally {
                        fclose($secondHandle);
                    }

                    return 'stored';
                },
            );

            self::assertSame('stored', $result);
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_it_rejects_a_write_that_would_consume_the_free_space_reserve(): void
    {
        $root = storage_path('framework/testing/cvc-reserve-'.Str::uuid());
        config()->set('crow-vault-canvas.storage.root', $root);
        config()->set('crow-vault-canvas.storage.max_markdown_bytes', 10);
        config()->set('crow-vault-canvas.storage.max_vault_bytes', 10);
        config()->set('crow-vault-canvas.storage.minimum_free_bytes', PHP_INT_MAX);
        $storage = new LocalMarkdownStorage;

        try {
            $storage->writeRevision((string) Str::uuid(), (string) Str::uuid(), 1, 'a');
            self::fail('The free-space reserve should have been enforced.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('content', $exception->errors());
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_it_counts_empty_revisions_toward_the_vault_entry_limit(): void
    {
        $root = storage_path('framework/testing/cvc-entries-'.Str::uuid());
        config()->set('crow-vault-canvas.storage.root', $root);
        config()->set('crow-vault-canvas.storage.max_markdown_bytes', 10);
        config()->set('crow-vault-canvas.storage.max_vault_bytes', 10);
        config()->set('crow-vault-canvas.storage.max_vault_entries', 5);
        config()->set('crow-vault-canvas.storage.minimum_free_bytes', 0);
        $storage = new LocalMarkdownStorage;
        $vaultId = (string) Str::uuid();

        try {
            $stored = $storage->writeRevision($vaultId, (string) Str::uuid(), 1, '');
            self::assertSame(hash('sha256', ''), $stored->contentHash);

            try {
                $storage->writeRevision($vaultId, (string) Str::uuid(), 1, '');
                self::fail('Empty revisions should consume the configured entry quota.');
            } catch (ValidationException $exception) {
                self::assertArrayHasKey('content', $exception->errors());
            }
        } finally {
            File::deleteDirectory($root);
        }
    }
}
