import { xsrfHeaders } from '../http/csrf';
import type {
    DeletionOutcome,
    EntityDeletion,
    EntityRestoration,
} from './types';

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

export async function deleteEntity(
    entitiesEndpoint: string,
    entityId: string,
    withSubnotes = false,
): Promise<DeletionOutcome> {
    const url = `${entitiesEndpoint}/${encodeURIComponent(entityId)}${withSubnotes ? '?with_subnotes=1' : ''}`;
    const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...xsrfHeaders() },
    });
    const payload = (await response.json()) as EntityDeletion & {
        code?: string;
        subnotes?: number;
        message?: string;
    };

    if (response.status === 409 && payload.code === 'has_subnotes') {
        return { kind: 'has-subnotes', subnotes: payload.subnotes ?? 0 };
    }

    if (!response.ok) {
        throw new Error(
            payload.message ?? 'Não foi possível concluir a operação.',
        );
    }

    return { kind: 'deleted', deletion: payload };
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
