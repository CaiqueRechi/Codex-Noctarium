<?php

declare(strict_types=1);

namespace CrowVaultCanvas;

use CrowVaultCanvas\Console\Commands\InitializeVaultCommand;
use CrowVaultCanvas\Console\Commands\MeasureDocumentsCommand;
use CrowVaultCanvas\Console\Commands\PurgeTrashCommand;
use CrowVaultCanvas\Console\Commands\ReindexVaultCommand;
use CrowVaultCanvas\Infrastructure\Storage\AttachmentStorage;
use CrowVaultCanvas\Infrastructure\Storage\LocalAttachmentStorage;
use CrowVaultCanvas\Infrastructure\Storage\LocalMarkdownStorage;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use Illuminate\Console\Scheduling\Schedule;
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
        $this->commands([
            InitializeVaultCommand::class,
            MeasureDocumentsCommand::class,
            PurgeTrashCommand::class,
            ReindexVaultCommand::class,
        ]);
        // D-13: the trash empties itself after seven days; the host's
        // scheduler has to be running for this to happen.
        $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
            $schedule->command(PurgeTrashCommand::class)->daily()->withoutOverlapping();
        });

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
