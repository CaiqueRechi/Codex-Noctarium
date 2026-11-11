import { xsrfHeaders } from '../http/csrf';
import type { RelationSummary } from './types';

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
            payload.message ?? 'Não foi possível concluir a operação.',
        );
    }

    return response;
}

export async function createRelation(
    endpoint: string,
    sourceEntityId: string,
    targetEntityId: string,
    contextId: string | null,
    relationType: string | null,
    isDirected: boolean,
): Promise<RelationSummary> {
    const response = await mutation(endpoint, {
        method: 'POST',
        body: JSON.stringify({
            source_entity_id: sourceEntityId,
            target_entity_id: targetEntityId,
            context_id: contextId,
            type: relationType,
            directed: isDirected,
            properties: {},
        }),
    });
    const payload = (await response.json()) as { relation: RelationSummary };

    return payload.relation;
}

export async function deleteRelation(endpoint: string, relationId: string) {
    await mutation(`${endpoint}/${encodeURIComponent(relationId)}`, {
        method: 'DELETE',
    });
}

export async function attachEntityToContext(
    contextsEndpoint: string,
    contextId: string,
    entityId: string,
) {
    await mutation(
        `${contextsEndpoint}/${encodeURIComponent(contextId)}/entities`,
        {
            method: 'POST',
            body: JSON.stringify({ entity_id: entityId }),
        },
    );
}

export async function saveEntityLayout(
    contextsEndpoint: string,
    contextId: string,
    entityId: string,
    position: { x: number; y: number },
    isPinned = true,
) {
    await mutation(
        `${contextsEndpoint}/${encodeURIComponent(contextId)}/entities/${encodeURIComponent(entityId)}/layout`,
        {
            method: 'PATCH',
            body: JSON.stringify({ position, pinned: isPinned }),
        },
    );
}
