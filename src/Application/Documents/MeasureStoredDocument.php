<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Domain\Knowledge\Content\NormalNoteContent;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;
use RuntimeException;

final readonly class MeasureStoredDocument
{
    public function __construct(
        private MarkdownStorage $storage,
        private NormalNoteContent $noteContent,
        private DatabaseManager $database,
        private Repository $config,
    ) {}

    /** @return bool whether a missing measure was filled in */
    public function handle(string $entityId): bool
    {
        return $this->database->transaction(function () use ($entityId): bool {
            $vaultId = (string) $this->config->get('crow-vault-canvas.vault.id');
            $isInVault = KnowledgeEntity::withTrashed()->where('vault_id', $vaultId)
                ->where('kind', KnowledgeEntity::KIND_DOCUMENT)->whereKey($entityId)->exists();
            $document = MarkdownDocument::withTrashed()->whereKey($entityId)->lockForUpdate()->first();

            if (! $isInVault || $document === null || $document->own_content !== null) {
                return false;
            }

            $content = $this->storage->read($vaultId, $entityId, $document->storage_path);

            if (! hash_equals($document->content_hash, hash('sha256', $content))) {
                throw new RuntimeException('The Markdown revision failed its integrity check.');
            }

            $document->update(['own_content' => $this->noteContent->measure($content)]);

            return true;
        }, 3);
    }
}
