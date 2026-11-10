<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Console\Commands;

use CrowVaultCanvas\Application\Documents\MeasureStoredDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use Illuminate\Console\Command;
use RuntimeException;

final class MeasureDocumentsCommand extends Command
{
    protected $signature = 'cvc:measure-documents {--chunk=100}';

    protected $description = 'Store the content measure of CVC documents that do not have one yet';

    public function handle(MeasureStoredDocument $measureStoredDocument): int
    {
        $chunkSize = max(1, min(1000, (int) $this->option('chunk')));
        $measured = 0;
        $unreadable = 0;

        KnowledgeEntity::withTrashed()
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->where('kind', KnowledgeEntity::KIND_DOCUMENT)
            ->whereHas('document', fn ($query) => $query->withTrashed()->whereNull('own_content'))
            ->select('id')
            ->chunkById($chunkSize, function ($entities) use ($measureStoredDocument, &$measured, &$unreadable): void {
                foreach ($entities as $entity) {
                    try {
                        $measured += $measureStoredDocument->handle((string) $entity->getKey()) ? 1 : 0;
                    } catch (RuntimeException) {
                        $unreadable++;
                    }
                }
            });

        $this->components->info("Measured {$measured} documents.");

        if ($unreadable > 0) {
            $this->components->error("{$unreadable} documents could not be read and remain unmeasured.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
