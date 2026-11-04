<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Perspectives;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use Illuminate\Validation\ValidationException;

final class ValidatePerspectiveFilters
{
    /**
     * @param  array{context_ids: list<string>, entity_types: list<string>}  $filters
     * @return array{context_ids: list<string>, entity_types: list<string>}
     */
    public function handle(array $filters): array
    {
        $contextIds = array_values(array_unique($filters['context_ids']));
        $entityTypes = array_values(array_unique($filters['entity_types']));
        $vaultId = (string) config('crow-vault-canvas.vault.id');
        $contextCount = KnowledgeContext::query()
            ->where('vault_id', $vaultId)
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->whereKey($contextIds)
            ->count();

        if ($contextCount !== count($contextIds)) {
            throw ValidationException::withMessages([
                'filters.context_ids' => 'Todos os contextos devem pertencer ao vault aberto.',
            ]);
        }

        return [
            'context_ids' => $contextIds,
            'entity_types' => $entityTypes,
        ];
    }
}
