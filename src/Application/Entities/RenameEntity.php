<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Entities;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;

final readonly class RenameEntity
{
    public function __construct(private DatabaseManager $database, private Repository $config) {}

    public function handle(string $entityId, string $title): KnowledgeEntity
    {
        $entity = $this->database->transaction(function () use ($entityId, $title): KnowledgeEntity {
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', (string) $this->config->get('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->firstOrFail();

            $entity->update(['title' => $title]);
            $entity->advanceSearchVersion();
            $this->renameOwnedContext($entity, $title);

            return $entity->load('document');
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($entityId);

        return $entity;
    }

    // A context that became a note keeps its name in step with the note's
    // title, as renaming that context already updates the note. The space
    // of subnotes of an ordinary note has no name of its own to follow.
    private function renameOwnedContext(KnowledgeEntity $entity, string $title): void
    {
        $context = $entity->noteSpace?->context;

        if ($context === null || $context->kind === KnowledgeContext::KIND_NOTE_SPACE) {
            return;
        }

        $context->update(['name' => $title]);
    }
}
