<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

use CrowVaultCanvas\Domain\Knowledge\Models\Attachment;
use CrowVaultCanvas\Domain\Knowledge\Models\DocumentRevision;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\NoteSpace;
use CrowVaultCanvas\Domain\Knowledge\Models\OperationalTask;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * D-13: a note left in the trash for seven days is deleted for good, with
 * its revisions, attachments and relations. A named version that held it
 * can no longer be restored afterwards: restoration checks every file it
 * points to and refuses without changing anything.
 */
final readonly class PurgeTrash
{
    public const RETENTION_DAYS = 7;

    public function __construct(
        private DatabaseManager $database,
        private Repository $config,
        private Filesystem $files,
    ) {}

    /** @return list<string> the ids of the notes deleted for good */
    public function handle(?Carbon $now = null): array
    {
        $cutoff = ($now ?? Carbon::now())->copy()->subDays(self::RETENTION_DAYS);
        $expired = KnowledgeEntity::onlyTrashed()
            ->where('vault_id', $this->vaultId())
            ->where('deleted_at', '<=', $cutoff)
            ->pluck('id')
            ->map(fn ($id): string => (string) $id)
            ->all();

        foreach ($expired as $entityId) {
            $this->purge($entityId);
        }

        return $expired;
    }

    private function purge(string $entityId): void
    {
        $this->database->transaction(function () use ($entityId): void {
            KnowledgeRelation::withTrashed()
                ->where(fn ($query) => $query->where('source_entity_id', $entityId)->orWhere('target_entity_id', $entityId))
                ->forceDelete();
            Attachment::withTrashed()->where('entity_id', $entityId)->forceDelete();
            MarkdownDocument::withTrashed()->whereKey($entityId)->update(['current_revision_id' => null]);
            MarkdownDocument::withTrashed()->whereKey($entityId)->forceDelete();
            DocumentRevision::query()->where('entity_id', $entityId)->delete();
            OperationalTask::withTrashed()->where('subject_entity_id', $entityId)->update(['subject_entity_id' => null]);
            $this->purgeSpaceOf($entityId);
            KnowledgeEntity::withTrashed()->whereKey($entityId)->forceDelete();
        }, 3);

        $this->files->deleteDirectory($this->entityDirectory($entityId));
    }

    // The space of subnotes goes with its note. A context nested in it keeps
    // its place in the hierarchy, so the space is only hidden then.
    private function purgeSpaceOf(string $entityId): void
    {
        $contextId = NoteSpace::query()->whereKey($entityId)->value('context_id');

        if ($contextId === null) {
            return;
        }

        NoteSpace::query()->whereKey($entityId)->delete();
        $space = KnowledgeContext::withTrashed()->find($contextId);

        if ($space === null) {
            return;
        }

        KnowledgeContext::withTrashed()->where('parent_id', $contextId)->exists()
            ? $space->delete()
            : $space->forceDelete();
    }

    private function entityDirectory(string $entityId): string
    {
        // The directory is deleted with everything in it; only a real id
        // may name it, never a path.
        if (! Str::isUuid($entityId) || ! Str::isUuid($this->vaultId())) {
            throw new RuntimeException('Refusing to purge a directory not named by ids.');
        }

        $root = rtrim((string) $this->config->get('crow-vault-canvas.storage.root'), '/\\');

        return $root.DIRECTORY_SEPARATOR.'vaults'.DIRECTORY_SEPARATOR.$this->vaultId()
            .DIRECTORY_SEPARATOR.'entities'.DIRECTORY_SEPARATOR.$entityId;
    }

    private function vaultId(): string
    {
        return (string) $this->config->get('crow-vault-canvas.vault.id');
    }
}
