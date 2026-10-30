<?php

declare(strict_types=1);

use CrowVaultCanvas\Http\Controllers\VaultController;
use Illuminate\Support\Facades\Route;

Route::middleware(config('crow-vault-canvas.route.middleware'))
    ->prefix(config('crow-vault-canvas.route.prefix'))
    ->name(config('crow-vault-canvas.route.name'))
    ->group(function (): void {
        Route::get('/', VaultController::class)->name('vault');
    });
