import { requireCount } from '../math/validate-measure';

export type SpringConnection = {
    sourceId: string;
    targetId: string;
    count?: number;
};

export function collectSpringConnections(
    bodyIds: ReadonlySet<string>,
    connections: readonly SpringConnection[],
): ReadonlyMap<string, ReadonlyMap<string, number>> {
    const counts = new Map<string, Map<string, number>>();

    for (const connection of connections) {
        const count = connection.count ?? 1;
        requireCount(count, 'Connection count');

        if (
            !bodyIds.has(connection.sourceId) ||
            !bodyIds.has(connection.targetId)
        ) {
            throw new Error(
                'A spring endpoint is outside the simulated space.',
            );
        }

        if (connection.sourceId === connection.targetId || count === 0) {
            continue;
        }

        const [sourceId, targetId] = [
            connection.sourceId,
            connection.targetId,
        ].sort();
        const targets = counts.get(sourceId) ?? new Map<string, number>();
        const combinedCount = (targets.get(targetId) ?? 0) + count;
        requireCount(combinedCount, 'Combined connection count');
        targets.set(targetId, combinedCount);
        counts.set(sourceId, targets);
    }

    return counts;
}

export function connectionCount(
    counts: ReadonlyMap<string, ReadonlyMap<string, number>>,
    firstId: string,
    secondId: string,
): number {
    const [sourceId, targetId] = [firstId, secondId].sort();

    return counts.get(sourceId)?.get(targetId) ?? 0;
}
