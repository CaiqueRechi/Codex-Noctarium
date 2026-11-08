<?php

declare(strict_types=1);

namespace CrowVaultCanvas;

use Illuminate\Cache\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;

final class NoteSpaceServiceProvider extends ServiceProvider
{
    public function boot(RateLimiter $rateLimiter): void
    {
        $rateLimiter->for('cvc-note-space-writes', static fn (Request $request): array => [
            Limit::perMinute(30)->by('user:'.($request->user()?->getAuthIdentifier() ?? 'guest')),
            Limit::perMinute(60)->by('ip:'.hash('sha256', $request->ip() ?? 'unknown')),
        ]);
    }
}
