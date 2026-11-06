<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Perspectives;

use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use Illuminate\Support\Facades\DB;

final readonly class UpdatePerspective
{
    public function __construct(
        private ValidatePerspectiveFilters $validateFilters,
    ) {}

    /** @param array{context_ids: list<string>, entity_types: list<string>} $filters */
    public function handle(string $perspectiveId, string $name, array $filters): Perspective
    {
        return DB::transaction(function () use ($perspectiveId, $name, $filters): Perspective {
            $perspective = Perspective::query()
                ->whereKey($perspectiveId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->firstOrFail();
            $perspective->update([
                'name' => $name,
                'filters' => $this->validateFilters->handle($filters),
            ]);

            return $perspective->load('layouts');
        }, 3);
    }
}
