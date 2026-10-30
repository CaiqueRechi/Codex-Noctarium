<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Console\Commands;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class InitializeVaultCommand extends Command
{
    protected $signature = 'cvc:initialize';

    protected $description = 'Create the fixed CVC vault and its initial universe';

    public function handle(): int
    {
        DB::transaction(function (): void {
            $vault = Vault::query()->firstOrCreate(
                ['id' => (string) config('crow-vault-canvas.vault.id')],
                ['name' => (string) config('crow-vault-canvas.vault.name')],
            );

            $vault->contexts()->firstOrCreate(
                [
                    'parent_id' => null,
                    'kind' => KnowledgeContext::KIND_UNIVERSE,
                ],
                [
                    'name' => (string) config('crow-vault-canvas.vault.initial_universe'),
                    'sort_order' => 0,
                ],
            );
        });

        $this->components->info('CVC vault initialized.');

        return self::SUCCESS;
    }
}
