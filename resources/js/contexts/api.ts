import type {
    ContextBreadcrumb,
    ContextSummary,
    UniverseSummary,
} from '../explorer/vault-explorer';
import { xsrfHeaders } from '../http/csrf';

export type ContextSlice = {
    contexts: UniverseSummary[];
    breadcrumbs: ContextBreadcrumb[];
};

type ContextSliceResponse = {
    slice?: ContextSlice;
    message?: string;
};

type ContextResponse = {
    context?: ContextSummary;
    message?: string;
};

export async function openContextSlice(
    endpoint: string,
    contextId: string | null,
): Promise<ContextSlice> {
    const url =
        contextId === null
            ? endpoint
            : `${endpoint}/${encodeURIComponent(contextId)}`;
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    });
    const payload = (await response.json()) as ContextSliceResponse;

    if (!response.ok || !payload.slice) {
        throw new Error(payload.message ?? 'Não foi possível abrir o assunto.');
    }

    return payload.slice;
}

type NoteSpaceResponse = {
    spaceId?: string;
    slice?: ContextSlice;
    message?: string;
};

// The space of subnotes of a note. The server creates it the first time and
// returns the same space afterwards.
export async function openNoteSpace(
    documentsEndpoint: string,
    entityId: string,
): Promise<{ spaceId: string; slice: ContextSlice }> {
    const response = await fetch(
        `${documentsEndpoint}/${encodeURIComponent(entityId)}/space`,
        {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json', ...xsrfHeaders() },
        },
    );
    const payload = (await response.json()) as NoteSpaceResponse;

    if (!response.ok || !payload.spaceId || !payload.slice) {
        throw new Error(
            payload.message ?? 'Não foi possível abrir as subnotas da nota.',
        );
    }

    return { spaceId: payload.spaceId, slice: payload.slice };
}

export async function createContext(
    endpoint: string,
    name: string,
    parentId: string | null,
): Promise<ContextSummary> {
    const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...xsrfHeaders(),
        },
        body: JSON.stringify({ name, parent_id: parentId }),
    });
    const payload = (await response.json()) as ContextResponse;

    if (!response.ok || !payload.context) {
        throw new Error(payload.message ?? 'Não foi possível criar o assunto.');
    }

    return payload.context;
}
