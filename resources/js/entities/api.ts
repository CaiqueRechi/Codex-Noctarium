import type { DocumentSummary } from '../documents/types';
import { xsrfHeaders } from '../http/csrf';
import type { EntityProperties } from './types';

type EntityResponse = {
    entity: DocumentSummary;
};

export async function updateEntityProperties(
    entitiesEndpoint: string,
    entityId: string,
    entityType: string | null,
    properties: EntityProperties,
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
            body: JSON.stringify({ type: entityType, properties }),
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
