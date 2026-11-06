<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application;

use CrowVaultCanvas\Domain\Knowledge\Models\Vault;

final class OpenVault
{
    public function handle(): Vault
    {
        $vaultId = (string) config('crow-vault-canvas.vault.id');

        return Vault::query()
            ->with([
                'relations',
                'perspectives.layouts',
                'perspectives.versions',
            ])
            ->findOrFail($vaultId);
    }
}
