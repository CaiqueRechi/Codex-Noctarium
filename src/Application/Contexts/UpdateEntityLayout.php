<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class UpdateEntityLayout
{
    public function __construct(private readonly RequireAvailableContext $requireAvailableContext) {}

    public function handle(
        string $contextId,
        string $entityId,
        float $positionX,
        float $positionY,
        bool $isPinned,
    ): void {
        $context = KnowledgeContext::query()
            ->whereKey($contextId)
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->firstOrFail();
        $this->requireAvailableContext->handle($context);
        $updated = $context->entities()->updateExistingPivot($entityId, [
            'position_x' => $positionX,
            'position_y' => $positionY,
            'is_pinned' => $isPinned,
        ]);

        if ($updated !== 1) {
            throw (new ModelNotFoundException)->setModel('context entity');
        }
    }
}
