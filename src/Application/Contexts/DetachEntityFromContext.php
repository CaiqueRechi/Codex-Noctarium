<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Database\DatabaseManager;
use Illuminate\Validation\ValidationException;

/**
 * D-13 "só daqui": a note that appears in several spaces leaves one of them
 * and lives on in the others. A note in a single space cannot be left
 * nowhere; that is a deletion, "de todos os lugares".
 */
final readonly class DetachEntityFromContext
{
    public function __construct(private DatabaseManager $database) {}

    public function handle(string $contextId, string $entityId): void
    {
        $this->database->transaction(function () use ($contextId, $entityId): void {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $entity = KnowledgeEntity::query()->where('vault_id', $vaultId)->whereKey($entityId)
                ->lockForUpdate()->firstOrFail();
            $places = $entity->contexts()->pluck('cvc_contexts.id')->map(fn ($id): string => (string) $id);

            if (! $places->contains($contextId)) {
                throw ValidationException::withMessages(['context_id' => 'A nota não está neste espaço.']);
            }

            if ($places->count() < 2) {
                throw ValidationException::withMessages([
                    'context_id' => 'Esta é a única participação da nota; para tirá-la daqui, exclua a nota.',
                ]);
            }

            $entity->contexts()->detach($contextId);
            $entity->advanceSearchVersion();
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($entityId);
    }
}
