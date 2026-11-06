export type SearchResult = {
    id: string;
    contextId: string;
    title: string | null;
    snippet: string;
    entityType: string | null;
    tags: string[];
};

export async function searchVault(
    endpoint: string,
    query: string,
    contextId: string,
    entityType: string,
    tag: string,
): Promise<SearchResult[]> {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('q', query);

    if (contextId) {
        url.searchParams.set('context_id', contextId);
    }

    if (entityType) {
        url.searchParams.set('entity_type', entityType);
    }

    if (tag) {
        url.searchParams.set('tag', tag);
    }

    const response = await fetch(url.toString(), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    });
    const payload = (await response.json()) as {
        results?: SearchResult[];
        message?: string;
    };

    if (!response.ok || !payload.results) {
        throw new Error(payload.message ?? 'Não foi possível buscar no vault.');
    }

    return payload.results;
}
