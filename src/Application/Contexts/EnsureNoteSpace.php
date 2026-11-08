<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\NoteSpace;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;

final readonly class EnsureNoteSpace
{
    public function __construct(private DatabaseManager $database, private Repository $config) {}

    public function handle(string $entityId): KnowledgeContext
    {
        return $this->database->transaction(function () use ($entityId): KnowledgeContext {
            $vaultId = (string) $this->config->get('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $entity = KnowledgeEntity::query()->where('vault_id', $vaultId)
                ->where('kind', KnowledgeEntity::KIND_DOCUMENT)
                ->whereHas('document')->whereKey($entityId)->lockForUpdate()->firstOrFail();
            $existing = NoteSpace::query()->whereKey($entity->getKey())->first();

            if ($existing !== null) {
                return KnowledgeContext::query()->where('vault_id', $vaultId)
                    ->whereKey($existing->context_id)->firstOrFail();
            }

            $context = KnowledgeContext::query()->create([
                'vault_id' => $vaultId,
                'parent_id' => null,
                'kind' => KnowledgeContext::KIND_NOTE_SPACE,
                'name' => 'Subnotas',
                'sort_order' => 0,
            ]);
            NoteSpace::query()->create([
                'entity_id' => $entity->getKey(),
                'context_id' => $context->getKey(),
            ]);

            return $context;
        }, 3);
    }
}
