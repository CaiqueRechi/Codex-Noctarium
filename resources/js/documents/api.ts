import type { OpenedDocument } from './types';

type DocumentResponse = {
    document: OpenedDocument;
};

async function requestDocument(
    url: string,
    init?: RequestInit,
): Promise<OpenedDocument> {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(init?.method && init.method !== 'GET'
                ? { 'X-CSRF-TOKEN': csrfToken() }
                : {}),
            ...init?.headers,
        },
        ...init,
    });
    const payload = (await response.json()) as Partial<DocumentResponse> & {
        message?: string;
    };

    if (!response.ok || !payload.document) {
        throw new Error(payload.message ?? 'Não foi possível acessar o documento.');
    }

    return payload.document;
}

export function createDocument(
    documentsEndpoint: string,
    contextId: string,
): Promise<OpenedDocument> {
    return requestDocument(documentsEndpoint, {
        method: 'POST',
        body: JSON.stringify({ context_id: contextId }),
    });
}

export function openDocument(
    documentsEndpoint: string,
    entityId: string,
): Promise<OpenedDocument> {
    return requestDocument(documentUrl(documentsEndpoint, entityId), {
        method: 'GET',
    });
}

export function saveDocument(
    documentsEndpoint: string,
    document: OpenedDocument,
    content: string,
): Promise<OpenedDocument> {
    return requestDocument(documentUrl(documentsEndpoint, document.id), {
        method: 'PATCH',
        body: JSON.stringify({ content, revision: document.revision }),
    });
}

function documentUrl(documentsEndpoint: string, entityId: string): string {
    return `${documentsEndpoint}/${encodeURIComponent(entityId)}`;
}

function csrfToken(): string {
    const token = document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content');

    if (!token) {
        throw new Error('Token CSRF indisponível. Recarregue a página.');
    }

    return token;
}
