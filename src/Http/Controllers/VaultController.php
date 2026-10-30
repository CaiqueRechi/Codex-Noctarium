<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

final class VaultController
{
    public function __invoke(): Response
    {
        return Inertia::render('cvc/vault');
    }
}
