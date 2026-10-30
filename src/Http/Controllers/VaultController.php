<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\OpenVault;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use Inertia\Inertia;
use Inertia\Response;

final class VaultController
{
    public function __invoke(OpenVault $openVault): Response
    {
        $vault = $openVault->handle();

        return Inertia::render('cvc/vault', [
            'vault' => [
                'id' => $vault->getKey(),
                'name' => $vault->name,
                'universes' => $vault->universes->map(fn (KnowledgeContext $universe): array => [
                    'id' => $universe->getKey(),
                    'name' => $universe->name,
                ])->values(),
            ],
        ]);
    }
}
