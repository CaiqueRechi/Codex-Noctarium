<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

final readonly class CreateMarkdownEntity
{
    private const EMPTY_NOTE_OWN_CONTENT = 0.0;

    public function __construct(
        private MarkdownStorage $storage,
        private DatabaseManager $database,
        private Repository $config,
    ) {}

    public function handle(?string $title = null): KnowledgeEntity
    {
        return $this->database->transaction(function () use ($title): KnowledgeEntity {
            $vaultId = (string) $this->config->get('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $entity = KnowledgeEntity::query()->create([
                'id' => (string) Str::uuid(),
                'vault_id' => $vaultId,
                'kind' => KnowledgeEntity::KIND_DOCUMENT,
                'title' => $title,
            ]);
            $stored = $this->storage->writeRevision($vaultId, (string) $entity->getKey(), 1, '');
            MarkdownDocument::query()->create([
                'entity_id' => $entity->getKey(),
                'storage_path' => $stored->path,
                'revision' => 1,
                'content_hash' => $stored->contentHash,
                'own_content' => self::EMPTY_NOTE_OWN_CONTENT,
                'current_revision_id' => $stored->revisionId,
            ]);

            return $entity;
        }, 3);
    }
}
