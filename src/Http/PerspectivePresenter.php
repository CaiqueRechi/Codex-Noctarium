<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http;

use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;

final class PerspectivePresenter
{
    public function __construct(
        private readonly VersionPresenter $versionPresenter,
    ) {}

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     sourcePerspectiveId: string|null,
     *     filters: array{contextIds: list<string>, entityTypes: list<string>},
     *     layouts: list<array{contextId: string, entityId: string, position: array{x: float, y: float}|null, isPinned: bool}>,
     *     versions: list<array{id: string, perspectiveId: string, name: string, kind: string, createdAt: string}>
     * }
     */
    public function toArray(Perspective $perspective): array
    {
        $perspective->loadMissing(['layouts', 'versions']);
        $filters = $perspective->filters;

        return [
            'id' => (string) $perspective->getKey(),
            'name' => $perspective->name,
            'sourcePerspectiveId' => $perspective->source_perspective_id,
            'filters' => [
                'contextIds' => array_values($filters['context_ids'] ?? []),
                'entityTypes' => array_values($filters['entity_types'] ?? []),
            ],
            'layouts' => $perspective->layouts->map(fn ($layout): array => [
                'contextId' => $layout->context_id,
                'entityId' => $layout->entity_id,
                'position' => $layout->position_x === null
                    ? null
                    : [
                        'x' => (float) $layout->position_x,
                        'y' => (float) $layout->position_y,
                    ],
                'isPinned' => (bool) $layout->is_pinned,
            ])->values()->all(),
            'versions' => $perspective->versions
                ->map(fn ($version): array => $this->versionPresenter->toArray($version))
                ->values()
                ->all(),
        ];
    }
}
