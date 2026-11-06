<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Operations;

use CrowVaultCanvas\Domain\Knowledge\Models\OperationalTask;
use Illuminate\Support\Collection;

final readonly class ListOperationalTasks
{
    /** @return Collection<int, OperationSummary> */
    public function handle(): Collection
    {
        $limit = max(1, min(50, (int) config('crow-vault-canvas.operations.history_limit', 20)));

        return OperationalTask::query()
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (OperationalTask $task): OperationSummary => OperationSummary::fromModel($task));
    }
}
