<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Domain\Knowledge\Content\Flowchart;
use CrowVaultCanvas\Domain\Knowledge\Content\InvalidFlowchart;
use CrowVaultCanvas\Domain\Knowledge\Content\NoteContent;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class SaveDocument
{
    public function __construct(
        private MarkdownStorage $storage,
        private OpenDocument $openDocument,
        private NoteContent $noteContent,
    ) {}

    public function handle(string $entityId, string $content, int $expectedRevision): OpenedDocument
    {
        DB::transaction(function () use ($entityId, $content, $expectedRevision): void {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->where('kind', KnowledgeEntity::KIND_DOCUMENT)
                ->lockForUpdate()
                ->firstOrFail();
            $document = MarkdownDocument::query()
                ->whereKey($entity->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($document->revision !== $expectedRevision) {
                throw new DocumentRevisionConflict('The document changed after it was opened.');
            }

            $this->requireReadableFlowchart($content);
            $revision = $document->revision + 1;
            $stored = $this->storage->writeRevision(
                $entity->vault_id,
                $entity->getKey(),
                $revision,
                $content,
            );

            $document->update([
                'storage_path' => $stored->path,
                'revision' => $revision,
                'content_hash' => $stored->contentHash,
                'own_content' => $this->noteContent->measure($content),
                'current_revision_id' => $stored->revisionId,
            ]);
            $entity->advanceSearchVersion();
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($entityId);

        return $this->openDocument->handle($entityId);
    }

    // RF-05: a flowchart that does not hold together is refused whole; no
    // partial diagram is ever stored.
    private function requireReadableFlowchart(string $content): void
    {
        if (! Flowchart::isFlowchart($content)) {
            return;
        }

        try {
            Flowchart::fromJson($content);
        } catch (InvalidFlowchart $invalid) {
            throw ValidationException::withMessages(['content' => $invalid->getMessage()]);
        }
    }
}
