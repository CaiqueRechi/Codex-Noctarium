<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Workspace;

final readonly class WorkspaceSnapshot
{
    public function __construct(
        public float $x,
        public float $y,
        public float $zoom,
        public ?string $focusEntityId,
        public ?string $perspectiveId,
        public ?string $focusContextId = null,
    ) {}

    /** @return array{viewport: array{x: float, y: float, zoom: float}, focusEntityId: string|null, perspectiveId: string|null, focusContextId: string|null} */
    public function toArray(): array
    {
        return [
            'viewport' => [
                'x' => $this->x,
                'y' => $this->y,
                'zoom' => $this->zoom,
            ],
            'focusEntityId' => $this->focusEntityId,
            'perspectiveId' => $this->perspectiveId,
            'focusContextId' => $this->focusContextId,
        ];
    }
}
