<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Jobs;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\SearchDocument;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class IndexKnowledgeEntity implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $entityId) {}

    public function handle(MarkdownStorage $storage): void
    {
        $entity = KnowledgeEntity::withTrashed()
            ->with(['document', 'contexts'])
            ->whereKey($this->entityId)
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->first();

        if ($entity === null) {
            SearchDocument::query()->whereKey($this->entityId)->delete();

            return;
        }

        $searchVersion = $entity->search_version;

        if ($entity->trashed() || $entity->document === null) {
            $this->deleteIfCurrent($searchVersion);

            return;
        }

        $content = $storage->read(
            $entity->vault_id,
            (string) $entity->getKey(),
            $entity->document->storage_path,
        );

        if (! hash_equals($entity->document->content_hash, hash('sha256', $content))) {
            throw new RuntimeException('The Markdown revision failed its integrity check during indexing.');
        }

        $relations = KnowledgeRelation::query()
            ->with(['source', 'target', 'context'])
            ->where('vault_id', $entity->vault_id)
            ->where(function ($query) use ($entity): void {
                $query->where('source_entity_id', $entity->getKey())
                    ->orWhere('target_entity_id', $entity->getKey());
            })
            ->get();
        $relationText = $relations->flatMap(fn (KnowledgeRelation $relation): array => [
            $relation->relation_type,
            $relation->source?->title,
            $relation->target?->title,
            $relation->context?->name,
            json_encode($relation->properties ?? [], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
        ])->filter()->implode(' ');

        $this->publishIfCurrent($searchVersion, $entity->document->content_hash, [
            'vault_id' => $entity->vault_id,
            'title' => $entity->title,
            'content' => $content,
            'content_hash' => $entity->document->content_hash,
            'entity_type' => $entity->entity_type,
            'tags' => $entity->tags ?? [],
            'properties' => json_encode(
                $entity->properties ?? [],
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE,
            ),
            'contexts' => $entity->contexts->pluck('name')->implode(' '),
            'relations' => $relationText,
        ]);
    }

    private function deleteIfCurrent(int $searchVersion): void
    {
        DB::transaction(function () use ($searchVersion): void {
            $entity = KnowledgeEntity::withTrashed()
                ->whereKey($this->entityId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->first();

            if ($entity === null) {
                SearchDocument::query()->whereKey($this->entityId)->delete();

                return;
            }

            if ($entity->search_version !== $searchVersion) {
                return;
            }

            $hasActiveDocument = MarkdownDocument::query()
                ->whereKey($this->entityId)
                ->exists();

            if ($entity->trashed() || ! $hasActiveDocument) {
                SearchDocument::query()->whereKey($this->entityId)->delete();
            }
        }, 3);
    }

    /** @param array<string, mixed> $payload */
    private function publishIfCurrent(int $searchVersion, string $contentHash, array $payload): void
    {
        DB::transaction(function () use ($searchVersion, $contentHash, $payload): void {
            $entity = KnowledgeEntity::query()
                ->whereKey($this->entityId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->first();
            $document = MarkdownDocument::query()
                ->whereKey($this->entityId)
                ->first();

            if ($entity === null || $document === null) {
                SearchDocument::query()->whereKey($this->entityId)->delete();

                return;
            }

            if (
                $entity->search_version !== $searchVersion
                || ! hash_equals($document->content_hash, $contentHash)
            ) {
                return;
            }

            SearchDocument::query()->updateOrCreate(
                ['entity_id' => $this->entityId],
                $payload,
            );
        }, 3);
    }
}
