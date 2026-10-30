<?php

declare(strict_types=1);

namespace CrowVaultCanvas;

use Illuminate\Support\ServiceProvider;

final class CrowVaultCanvasServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom($this->packagePath('config/crow-vault-canvas.php'), 'crow-vault-canvas');
    }

    public function boot(): void
    {
        if (! $this->app['config']->boolean('crow-vault-canvas.enabled')) {
            return;
        }

        $this->loadRoutesFrom($this->packagePath('routes/web.php'));
    }

    private function packagePath(string $path): string
    {
        return dirname(__DIR__).DIRECTORY_SEPARATOR.$path;
    }
}
