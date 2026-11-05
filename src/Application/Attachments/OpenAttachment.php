<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Attachments;

use CrowVaultCanvas\Domain\Knowledge\Models\Attachment;
use CrowVaultCanvas\Infrastructure\Storage\AttachmentStorage;

final readonly class OpenAttachment
{
    public function __construct(private AttachmentStorage $storage) {}

    public function handle(string $attachmentId): OpenedAttachment
    {
        $attachment = Attachment::query()
            ->whereKey($attachmentId)
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->whereHas('entity', fn ($query) => $query
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->where('kind', 'document'))
            ->firstOrFail();
        $stream = $this->storage->open(
            $attachment->vault_id,
            $attachment->entity_id,
            $attachment->storage_path,
            $attachment->content_hash,
        );

        return new OpenedAttachment(
            $attachment->original_name,
            $attachment->mime_type,
            $attachment->size_bytes,
            $stream,
        );
    }
}
