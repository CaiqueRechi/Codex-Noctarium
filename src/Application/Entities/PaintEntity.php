<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Entities;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\NoteColor;
use Illuminate\Contracts\Config\Repository;

final readonly class PaintEntity
{
    public function __construct(private Repository $config) {}

    public function handle(string $entityId, ?NoteColor $color): KnowledgeEntity
    {
        $entity = KnowledgeEntity::query()
            ->whereKey($entityId)
            ->where('vault_id', (string) $this->config->get('crow-vault-canvas.vault.id'))
            ->firstOrFail();

        $entity->update(['color' => $color?->value]);

        return $entity;
    }
}
