<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Jobs;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\OperationalTask;
use CrowVaultCanvas\Domain\Knowledge\Models\SearchDocument;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

final class IndexKnowledgeEntity implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $entityId,
        public readonly ?string $operationId = null,
    ) {}

    public static function dispatchTracked(string $entityId): void
    {
        $task = null;

        try {
            $task = OperationalTask::query()->create([
                'id' => (string) Str::uuid(),
                'vault_id' => (string) config('crow-vault-canvas.vault.id'),
                'subject_entity_id' => $entityId,
                'operation_type' => 'search_index',
                'status' => OperationalTask::STATUS_PENDING,
                'progress_current' => 0,
                'progress_total' => 1,
                'message' => 'Aguardando atualização do índice de busca.',
            ]);

            Bus::dispatch((new self($entityId, (string) $task->getKey()))->afterCommit());
        } catch (Throwable $exception) {
            try {
                $task?->forceFill([
                    'status' => OperationalTask::STATUS_FAILED,
                    'message' => 'Não foi possível enviar a atualização para a fila.',
                    'error_code' => 'search_index_dispatch_failed',
                    'finished_at' => now(),
                ])->save();
            } catch (Throwable $trackingException) {
                report($trackingException);
            }

            report($exception);
        }
    }

    public function handle(MarkdownStorage $storage): void
    {
        $this->markRunning();
        $this->index($storage);
        $this->markSucceeded();
    }

    public function failed(?Throwable $exception): void
    {
        $this->updateOperation([
            'status' => OperationalTask::STATUS_FAILED,
            'message' => 'Falha ao atualizar o índice. Execute cvc:reindex para tentar novamente.',
            'error_code' => 'search_index_failed',
            'finished_at' => now(),
        ]);
    }

    private function index(MarkdownStorage $storage): void
    {
        $entity = KnowledgeEntity::withTrashed()
            ->with(['document', 'contexts', 'noteSpace.context'])
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

        $contextNames = $entity->contexts->pluck('name');
        $ownContext = $entity->noteSpace?->context;

        if ($ownContext !== null && $ownContext->kind !== KnowledgeContext::KIND_NOTE_SPACE) {
            $contextNames->push($ownContext->name);
        }

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
            'contexts' => $contextNames->filter()->unique()->implode(' '),
            'relations' => $relationText,
        ]);
    }

    private function markRunning(): void
    {
        $this->updateOperation([
            'status' => OperationalTask::STATUS_RUNNING,
            'message' => 'Atualizando o índice de busca.',
            'started_at' => now(),
        ]);
    }

    private function markSucceeded(): void
    {
        $this->updateOperation([
            'status' => OperationalTask::STATUS_SUCCEEDED,
            'progress_current' => 1,
            'message' => 'Índice de busca atualizado.',
            'error_code' => null,
            'finished_at' => now(),
        ]);
    }

    /** @param array<string, mixed> $attributes */
    private function updateOperation(array $attributes): void
    {
        if ($this->operationId === null) {
            return;
        }

        try {
            OperationalTask::query()
                ->whereKey($this->operationId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->update($attributes);
        } catch (Throwable $exception) {
            report($exception);
        }
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
