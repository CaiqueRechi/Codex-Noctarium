<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Operations\ListOperationalTasks;
use Illuminate\Http\JsonResponse;

final class OperationalStatusController
{
    public function __invoke(ListOperationalTasks $listOperationalTasks): JsonResponse
    {
        return response()->json([
            'tasks' => $listOperationalTasks->handle()
                ->map(fn ($task): array => $task->toArray())
                ->values(),
        ]);
    }
}
