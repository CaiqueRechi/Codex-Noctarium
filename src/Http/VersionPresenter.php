<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http;

use CrowVaultCanvas\Domain\Knowledge\Models\VaultVersion;

final class VersionPresenter
{
    /** @return array{id: string, perspectiveId: string, name: string, kind: string, createdAt: string} */
    public function toArray(VaultVersion $version): array
    {
        return [
            'id' => (string) $version->getKey(),
            'perspectiveId' => $version->perspective_id,
            'name' => $version->name,
            'kind' => $version->kind,
            'createdAt' => $version->created_at->toIso8601String(),
        ];
    }
}
