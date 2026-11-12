<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Entities;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * D-09: how often a note is used, for the score of /link suggestions. An
 * access is each opening of the note's content; a search is each time the
 * note is chosen among the compass results. Both are added in the database
 * so two openings at once never lose one.
 */
final readonly class CountNoteUse
{
    public function __construct(private Repository $config) {}

    public function access(string $entityId): void
    {
        $this->add($entityId, 'access_count');
    }

    public function search(string $entityId): void
    {
        $this->add($entityId, 'search_count');
    }

    private function add(string $entityId, string $counter): void
    {
        $counted = KnowledgeEntity::query()
            ->whereKey($entityId)
            ->where('vault_id', (string) $this->config->get('crow-vault-canvas.vault.id'))
            ->increment($counter);

        if ($counted === 0) {
            throw (new ModelNotFoundException())->setModel(KnowledgeEntity::class, [$entityId]);
        }
    }
}
