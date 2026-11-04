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

            $universe = $vault->contexts()->firstOrCreate(
                [
                    'parent_id' => null,
                    'kind' => KnowledgeContext::KIND_UNIVERSE,
                ],
                [
                    'name' => (string) config('crow-vault-canvas.vault.initial_universe'),
                    'sort_order' => 0,
                ],
            );

            $vault->contexts()->firstOrCreate(
                [
                    'parent_id' => $universe->getKey(),
                    'kind' => KnowledgeContext::KIND_CONTEXT,
                ],
                [
                    'name' => (string) config('crow-vault-canvas.vault.initial_context'),
                    'sort_order' => 0,
                ],
            );

            $vault->perspectives()->firstOrCreate(
                ['name' => 'Principal'],
                [
                    'source_perspective_id' => null,
                    'filters' => [
                        'context_ids' => [],
                        'entity_types' => [],
                    ],
                ],
            );
        });

        $this->components->info('CVC vault initialized.');

        return self::SUCCESS;
    }
}
