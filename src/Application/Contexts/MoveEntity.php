<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Database\DatabaseManager;
use Illuminate\Validation\ValidationException;

/**
 * RF-08 "Mover para…": a note leaves one space for another. Its subnotes
 * live in its own space, which belongs to the note, so they come along
 * without being touched; its relations stay as they are.
 */
final readonly class MoveEntity
{
    public function __construct(
        private DatabaseManager $database,
        private NoteSpaceHierarchy $hierarchy,
        private RequireAvailableContext $requireAvailableContext,
    ) {}

    public function handle(string $entityId, string $fromContextId, string $toContextId): void
    {
        $this->database->transaction(function () use ($entityId, $fromContextId, $toContextId): void {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $entity = KnowledgeEntity::query()->where('vault_id', $vaultId)->whereKey($entityId)
                ->lockForUpdate()->firstOrFail();
            $destination = KnowledgeContext::query()->where('vault_id', $vaultId)->whereKey($toContextId)
                ->lockForUpdate()->firstOrFail();
            $this->requireAvailableContext->handle($destination);

            if (! $entity->contexts()->whereKey($fromContextId)->exists()) {
                throw ValidationException::withMessages([
                    'from_context_id' => 'A nota não está neste espaço.',
                ]);
            }

            if ($fromContextId === $toContextId) {
                return;
            }

            $this->hierarchy->assertCanAttach($toContextId, $entityId);
            $entity->contexts()->detach($fromContextId);
            $entity->contexts()->syncWithoutDetaching([$toContextId]);
            $entity->advanceSearchVersion();
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($entityId);
    }
}
