<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Console\Commands;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Console\Command;

final class ReindexVaultCommand extends Command
{
    protected $signature = 'cvc:reindex {--chunk=100}';

    protected $description = 'Queue a rebuild of the authorized CVC search index';

    public function handle(): int
    {
        $chunkSize = max(1, min(1000, (int) $this->option('chunk')));
        $count = 0;

        KnowledgeEntity::query()
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->orderBy('id')
            ->chunk($chunkSize, function ($entities) use (&$count): void {
                foreach ($entities as $entity) {
                    IndexKnowledgeEntity::dispatch((string) $entity->getKey());
                    $count++;
                }
            });

        $this->components->info("Queued {$count} entities for indexing.");

        return self::SUCCESS;
    }
}
