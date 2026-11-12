import type { DocumentSummary } from '../documents/types';
import { xsrfHeaders } from '../http/csrf';
import type { EntityProperties } from './types';

type EntityResponse = {
    entity: DocumentSummary;
};

export async function renameEntity(
    entitiesEndpoint: string,
    entityId: string,
    title: string,
): Promise<{ id: string; title: string }> {
    const response = await fetch(
        `${entitiesEndpoint}/${encodeURIComponent(entityId)}/title`,
        {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...xsrfHeaders(),
            },
            body: JSON.stringify({ title }),
        },
    );
    const payload = (await response.json()) as {
        entity?: { id: string; title: string };
        message?: string;
    };

    if (!response.ok || !payload.entity) {
        throw new Error(payload.message ?? 'Não foi possível renomear a nota.');
    }

    return payload.entity;
}

// D-09: a note chosen among the compass results counts as searched.
export async function countNoteSearch(
    entitiesEndpoint: string,
    entityId: string,
): Promise<void> {
    const response = await fetch(
        `${entitiesEndpoint}/${encodeURIComponent(entityId)}/searches`,
        {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json', ...xsrfHeaders() },
        },
    );

    if (!response.ok) {
        throw new Error('Não foi possível contar a pesquisa.');
    }
}

export async function paintEntity(
    entitiesEndpoint: string,
    entityId: string,
    color: string | null,
): Promise<{ id: string; color: string | null }> {
    const response = await fetch(
        `${entitiesEndpoint}/${encodeURIComponent(entityId)}/color`,
        {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...xsrfHeaders(),
            },
            body: JSON.stringify({ color }),
        },
    );
    const payload = (await response.json()) as {
        entity?: { id: string; color: string | null };
        message?: string;
    };

    if (!response.ok || !payload.entity) {
        throw new Error(payload.message ?? 'Não foi possível mudar a cor.');
    }

    return payload.entity;
}

export async function updateEntityProperties(
    entitiesEndpoint: string,
    entityId: string,
    entityType: string | null,
    properties: EntityProperties,
    tags: string[],
): Promise<DocumentSummary> {
    const response = await fetch(
        `${entitiesEndpoint}/${encodeURIComponent(entityId)}`,
        {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...xsrfHeaders(),
            },
            body: JSON.stringify({ type: entityType, properties, tags }),
        },
    );
    const payload = (await response.json()) as Partial<EntityResponse> & {
        message?: string;
    };

    if (!response.ok || !payload.entity) {
        throw new Error(
            payload.message ?? 'Não foi possível salvar as propriedades.',
        );
    }

    return payload.entity;
}
