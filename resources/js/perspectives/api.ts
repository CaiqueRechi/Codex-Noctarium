import { xsrfHeaders } from '../http/csrf';
import type { PerspectiveFilters, PerspectiveSummary } from './types';

async function mutation(url: string, init: RequestInit): Promise<Response> {
    const response = await fetch(url, {
        ...init,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...xsrfHeaders(),
            ...init.headers,
        },
    });

    if (!response.ok) {
        const payload = (await response.json()) as { message?: string };

        throw new Error(
            payload.message ?? 'Não foi possível atualizar a perspectiva.',
        );
    }

    return response;
}

function requestFilters(filters: PerspectiveFilters) {
    return {
        context_ids: filters.contextIds,
        entity_types: filters.entityTypes,
    };
}

export async function createPerspective(
    endpoint: string,
    name: string,
    sourcePerspectiveId: string | null,
    filters: PerspectiveFilters,
): Promise<PerspectiveSummary> {
    const response = await mutation(endpoint, {
        method: 'POST',
        body: JSON.stringify({
            name,
            source_perspective_id: sourcePerspectiveId,
            filters: requestFilters(filters),
        }),
    });
    const payload = (await response.json()) as {
        perspective: PerspectiveSummary;
    };

    return payload.perspective;
}

export async function updatePerspective(
    endpoint: string,
    perspectiveId: string,
    name: string,
    filters: PerspectiveFilters,
): Promise<PerspectiveSummary> {
    const response = await mutation(
        `${endpoint}/${encodeURIComponent(perspectiveId)}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ name, filters: requestFilters(filters) }),
        },
    );
    const payload = (await response.json()) as {
        perspective: PerspectiveSummary;
    };

    return payload.perspective;
}

export async function savePerspectiveLayout(
    endpoint: string,
    perspectiveId: string,
    contextId: string,
    entityId: string,
    position: { x: number; y: number },
    isPinned = true,
): Promise<void> {
    await mutation(
        `${endpoint}/${encodeURIComponent(perspectiveId)}/contexts/${encodeURIComponent(contextId)}/entities/${encodeURIComponent(entityId)}/layout`,
        {
            method: 'PATCH',
            body: JSON.stringify({ position, pinned: isPinned }),
        },
    );
}
