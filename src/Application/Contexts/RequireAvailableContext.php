<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RequireAvailableContext
{
    public function handle(KnowledgeContext $context): void
    {
        if ($context->kind !== KnowledgeContext::KIND_NOTE_SPACE) {
            return;
        }

        $hasOwner = $context->noteSpace()
            ->whereHas('entity', fn ($query) => $query->where('vault_id', $context->vault_id))
            ->exists();

        if (! $hasOwner) {
            throw (new ModelNotFoundException)->setModel(KnowledgeContext::class);
        }
    }
}
