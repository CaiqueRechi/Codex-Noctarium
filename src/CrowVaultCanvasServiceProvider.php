<?php

declare(strict_types=1);

namespace CrowVaultCanvas;

use CrowVaultCanvas\Console\Commands\InitializeVaultCommand;
use CrowVaultCanvas\Console\Commands\ReindexVaultCommand;
use CrowVaultCanvas\Infrastructure\Storage\AttachmentStorage;
use CrowVaultCanvas\Infrastructure\Storage\LocalAttachmentStorage;
use CrowVaultCanvas\Infrastructure\Storage\LocalMarkdownStorage;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;

final class CrowVaultCanvasServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom($this->packagePath('config/crow-vault-canvas.php'), 'crow-vault-canvas');
        $this->app->register(NoteSpaceServiceProvider::class);
        $this->app->singleton(MarkdownStorage::class, LocalMarkdownStorage::class);
        $this->app->singleton(AttachmentStorage::class, LocalAttachmentStorage::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom($this->packagePath('database/migrations'));
        $this->commands([InitializeVaultCommand::class, ReindexVaultCommand::class]);

        if (! $this->app['config']->boolean('crow-vault-canvas.enabled')) {
            return;
        }

        $documentUpdatePath = trim((string) config('crow-vault-canvas.route.prefix'), '/').'/documents/*';
        $preservesMarkdown = static fn (Request $request): bool => $request->isMethod('PATCH')
            && $request->is($documentUpdatePath);

        TrimStrings::skipWhen($preservesMarkdown);
        ConvertEmptyStringsToNull::skipWhen($preservesMarkdown);
        $this->loadRoutesFrom($this->packagePath('routes/web.php'));
    }

    private function packagePath(string $path): string
    {
        return dirname(__DIR__).DIRECTORY_SEPARATOR.$path;
    }
}
