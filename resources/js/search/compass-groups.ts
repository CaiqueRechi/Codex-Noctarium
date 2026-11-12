import type { SearchResult } from './api';

export type CompassGroups =
    | { kind: 'split'; here: SearchResult[]; elsewhere: SearchResult[] }
    | { kind: 'single'; results: SearchResult[] };

// D-11: inside a universe the results split into "Neste universo" and
// "Outros universos"; at the galaxy view, with no universe open, they form
// one list where each result shows its path.
export function groupCompassResults(
    results: readonly SearchResult[],
    currentUniverseId: string | null,
): CompassGroups {
    if (currentUniverseId === null) {
        return { kind: 'single', results: [...results] };
    }

    const here = results.filter(
        (result) => result.path?.[0]?.id === currentUniverseId,
    );

    return {
        kind: 'split',
        here,
        elsewhere: results.filter((result) => !here.includes(result)),
    };
}

// D-11: near is the space open now; anything else is far.
export function isNearResult(
    result: SearchResult,
    openContextId: string | null,
): boolean {
    return openContextId !== null && result.contextId === openContextId;
}
