<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Attachments;

use CrowVaultCanvas\Domain\Knowledge\Models\Attachment;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Infrastructure\Storage\AttachmentStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

final readonly class CreateAttachment
{
    public function __construct(
        private AttachmentInspector $inspector,
        private AttachmentStorage $storage,
    ) {}

    public function handle(string $entityId, UploadedFile $file): Attachment
    {
        $inspected = $this->inspector->inspect($file);
        $attachmentId = (string) Str::uuid();
        $storedPath = null;
        $vaultId = (string) config('crow-vault-canvas.vault.id');

        try {
            return DB::transaction(function () use (
                $entityId,
                $file,
                $inspected,
                $attachmentId,
                $vaultId,
                &$storedPath,
            ): Attachment {
                $entity = KnowledgeEntity::query()
                    ->whereKey($entityId)
                    ->where('vault_id', $vaultId)
                    ->where('kind', KnowledgeEntity::KIND_DOCUMENT)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (Attachment::query()
                    ->where('entity_id', $entity->getKey())
                    ->where('content_hash', $inspected->contentHash)
                    ->exists()) {
                    throw ValidationException::withMessages([
                        'file' => 'Este arquivo já está anexado à entidade.',
                    ]);
                }

                $stored = $this->storage->store(
                    $file,
                    $vaultId,
                    (string) $entity->getKey(),
                    $attachmentId,
                    $inspected->extension,
                );
                $storedPath = $stored->path;

                return Attachment::query()->create([
                    'id' => $attachmentId,
                    'vault_id' => $vaultId,
                    'entity_id' => $entity->getKey(),
                    'original_name' => $inspected->originalName,
                    'mime_type' => $inspected->mimeType,
                    'size_bytes' => $inspected->sizeBytes,
                    'content_hash' => $inspected->contentHash,
                    'storage_path' => $stored->path,
                ]);
            }, 3);
        } catch (Throwable $exception) {
            if ($storedPath !== null) {
                $this->storage->delete($vaultId, $entityId, $storedPath);
            }

            throw $exception;
        }
    }
}
