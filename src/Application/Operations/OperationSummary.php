<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Operations;

use CrowVaultCanvas\Domain\Knowledge\Models\OperationalTask;

final readonly class OperationSummary
{
    public function __construct(
        public string $id,
        public string $type,
        public string $status,
        public int $progressCurrent,
        public int $progressTotal,
        public string $message,
        public ?string $errorCode,
        public string $createdAt,
        public ?string $finishedAt,
    ) {}

    public static function fromModel(OperationalTask $task): self
    {
        $status = $task->status;
        $message = $task->message;
        $staleAfter = max(60, (int) config('crow-vault-canvas.operations.stale_after_seconds', 300));

        if (
            in_array($status, [OperationalTask::STATUS_PENDING, OperationalTask::STATUS_RUNNING], true)
            && $task->updated_at?->lt(now()->subSeconds($staleAfter))
        ) {
            $status = 'attention';
            $message = 'Tarefa sem confirmação recente. Verifique o worker da fila.';
        }

        return new self(
            (string) $task->getKey(),
            $task->operation_type,
            $status,
            $task->progress_current,
            $task->progress_total,
            $message,
            $task->error_code,
            $task->created_at?->toAtomString() ?? now()->toAtomString(),
            $task->finished_at?->toAtomString(),
        );
    }

    /** @return array<string, int|string|null> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'status' => $this->status,
            'progressCurrent' => $this->progressCurrent,
            'progressTotal' => $this->progressTotal,
            'message' => $this->message,
            'errorCode' => $this->errorCode,
            'createdAt' => $this->createdAt,
            'finishedAt' => $this->finishedAt,
        ];
    }
}
