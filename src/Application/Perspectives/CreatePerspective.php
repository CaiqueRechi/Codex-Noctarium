<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Perspectives;

use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use Illuminate\Support\Facades\DB;

final readonly class CreatePerspective
{
    public function __construct(
        private ValidatePerspectiveFilters $validateFilters,
    ) {}

    /** @param array{context_ids: list<string>, entity_types: list<string>} $filters */
    public function handle(string $name, ?string $sourcePerspectiveId, array $filters): Perspective
    {
        return DB::transaction(function () use ($name, $sourcePerspectiveId, $filters): Perspective {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            $source = $sourcePerspectiveId === null
                ? null
                : Perspective::query()
                    ->whereKey($sourcePerspectiveId)
                    ->where('vault_id', $vaultId)
                    ->lockForUpdate()
                    ->firstOrFail();
            $validatedFilters = $source === null
                ? $this->validateFilters->handle($filters)
                : $this->validateFilters->handle($source->filters);
            $perspective = Perspective::query()->create([
                'vault_id' => $vaultId,
                'source_perspective_id' => $source?->getKey(),
                'name' => $name,
                'filters' => $validatedFilters,
            ]);

            $baseLayouts = DB::table('cvc_context_entity')
                ->join('cvc_contexts', 'cvc_contexts.id', '=', 'cvc_context_entity.context_id')
                ->join('cvc_entities', 'cvc_entities.id', '=', 'cvc_context_entity.entity_id')
                ->where('cvc_contexts.vault_id', $vaultId)
                ->where('cvc_entities.vault_id', $vaultId)
                ->select([
                    'cvc_context_entity.context_id',
                    'cvc_context_entity.entity_id',
                    'cvc_context_entity.position_x',
                    'cvc_context_entity.position_y',
                    'cvc_context_entity.is_pinned',
                ])
                ->get()
                ->keyBy(fn (object $layout): string => "{$layout->context_id}:{$layout->entity_id}");

            if ($source !== null) {
                $source->layouts()->get()->each(function ($layout) use ($baseLayouts): void {
                    $baseLayouts->put("{$layout->context_id}:{$layout->entity_id}", $layout);
                });
            }

            $timestamp = now();
            $rows = $baseLayouts->map(fn (object $layout): array => [
                'perspective_id' => $perspective->getKey(),
                'context_id' => $layout->context_id,
                'entity_id' => $layout->entity_id,
                'position_x' => $layout->position_x,
                'position_y' => $layout->position_y,
                'is_pinned' => $layout->is_pinned,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ])->values()->all();

            if ($rows !== []) {
                DB::table('cvc_perspective_layouts')->insert($rows);
            }

            return $perspective->load('layouts');
        }, 3);
    }
}
