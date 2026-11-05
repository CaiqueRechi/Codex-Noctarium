<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\OperationalTask;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Queue;
use RuntimeException;

final class OperationalStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_13_exposes_pending_and_completed_queue_work_without_false_success(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        Queue::fake();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();

        $document = $this->app->make(CreateDocument::class)
            ->handle((string) $context->getKey());
        $task = OperationalTask::query()->latest()->firstOrFail();

        self::assertSame(OperationalTask::STATUS_PENDING, $task->status);
        $this->getJson('/vault/operations')
            ->assertOk()
            ->assertJsonPath('tasks.0.id', $task->getKey())
            ->assertJsonPath('tasks.0.status', OperationalTask::STATUS_PENDING)
            ->assertJsonPath('tasks.0.progressCurrent', 0);

        $job = Queue::pushed(IndexKnowledgeEntity::class)->first();
        self::assertInstanceOf(IndexKnowledgeEntity::class, $job);
        self::assertSame($document->id, $job->entityId);
        $job->handle($this->app->make(MarkdownStorage::class));

        $this->getJson('/vault/operations')
            ->assertOk()
            ->assertJsonPath('tasks.0.status', OperationalTask::STATUS_SUCCEEDED)
            ->assertJsonPath('tasks.0.progressCurrent', 1)
            ->assertJsonPath('tasks.0.finishedAt', fn ($value): bool => is_string($value));
    }

    public function test_rf_13_reports_a_safe_queue_failure_without_leaking_exception_details(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        Queue::fake();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $job = Queue::pushed(IndexKnowledgeEntity::class)->first();
        self::assertInstanceOf(IndexKnowledgeEntity::class, $job);

        $job->failed(new RuntimeException('secret connection password'));

        $task = OperationalTask::query()->latest()->firstOrFail();
        self::assertSame(OperationalTask::STATUS_FAILED, $task->status);
        self::assertSame('search_index_failed', $task->error_code);
        self::assertStringNotContainsString('secret', $task->message);
        $this->getJson('/vault/operations')
            ->assertOk()
            ->assertJsonPath('tasks.0.status', OperationalTask::STATUS_FAILED)
            ->assertJsonPath('tasks.0.errorCode', 'search_index_failed');
    }

    public function test_rf_13_marks_stale_queue_work_as_requiring_attention(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $task = OperationalTask::query()->create([
            'vault_id' => (string) config('crow-vault-canvas.vault.id'),
            'operation_type' => 'search_index',
            'status' => OperationalTask::STATUS_RUNNING,
            'progress_current' => 0,
            'progress_total' => 1,
            'message' => 'Atualizando o índice de busca.',
        ]);
        $task->timestamps = false;
        $task->forceFill([
            'created_at' => now()->subMinutes(10),
            'updated_at' => now()->subMinutes(10),
        ])->save();

        $this->getJson('/vault/operations')
            ->assertOk()
            ->assertJsonPath('tasks.0.status', 'attention')
            ->assertJsonPath(
                'tasks.0.message',
                'Tarefa sem confirmação recente. Verifique o worker da fila.',
            );
    }

    public function test_rf_13_a_dispatch_failure_never_turns_a_durable_document_save_into_a_false_failure(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        Bus::shouldReceive('dispatch')
            ->once()
            ->andThrow(new RuntimeException('queue connection unavailable'));

        $document = $this->app->make(CreateDocument::class)
            ->handle((string) $context->getKey());

        self::assertSame(1, $document->revision);
        self::assertDatabaseHas('cvc_documents', ['entity_id' => $document->id]);
        self::assertDatabaseHas('cvc_operations', [
            'subject_entity_id' => $document->id,
            'status' => OperationalTask::STATUS_FAILED,
            'error_code' => 'search_index_dispatch_failed',
        ]);
    }
}
