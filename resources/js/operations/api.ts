import type { OperationalTask } from './types';

export async function fetchOperationalTasks(
    endpoint: string,
): Promise<OperationalTask[]> {
    const response = await fetch(endpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    });
    const payload = (await response.json()) as {
        tasks?: OperationalTask[];
        message?: string;
    };

    if (!response.ok || !payload.tasks) {
        throw new Error(
            payload.message ?? 'Não foi possível atualizar o estado operacional.',
        );
    }

    return payload.tasks;
}
