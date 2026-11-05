import { xsrfHeaders } from '../http/csrf';
import type { EntityDeletion, EntityRestoration } from './types';

async function mutation<T>(url: string, method: 'DELETE' | 'POST'): Promise<T> {
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...xsrfHeaders(),
        },
    });
    const payload = (await response.json()) as T & { message?: string };

    if (!response.ok) {
        throw new Error(
            payload.message ?? 'Não foi possível concluir a operação.',
        );
    }

    return payload;
}

export function deleteEntity(
    entitiesEndpoint: string,
    entityId: string,
): Promise<EntityDeletion> {
    return mutation(
        `${entitiesEndpoint}/${encodeURIComponent(entityId)}`,
        'DELETE',
    );
}

export function restoreEntity(
    trashEndpoint: string,
    entityId: string,
): Promise<EntityRestoration> {
    return mutation(
        `${trashEndpoint}/${encodeURIComponent(entityId)}/restore`,
        'POST',
    );
}
