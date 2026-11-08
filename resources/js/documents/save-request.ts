import { xsrfHeaders } from '../http/csrf';
import type { OpenedDocument } from './types';

export class DocumentSaveError extends Error {
    constructor(
        message: string,
        readonly retryable: boolean = false,
    ) {
        super(message);
    }
}

export async function requestDocumentSave(
    endpoint: string,
    document: OpenedDocument,
    content: string,
): Promise<OpenedDocument> {
    const headers = xsrfHeaders();
    let response: Response;

    try {
        response = await fetch(
            `${endpoint}/${encodeURIComponent(document.id)}`,
            {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({ content, revision: document.revision }),
            },
        );
    } catch {
        throw new DocumentSaveError(
            'Não foi possível conectar para salvar.',
            true,
        );
    }

    if (!response.ok) {
        const messages: Record<number, string> = {
            401: 'Sua sessão expirou. Entre novamente para continuar.',
            403: 'Você não tem permissão para salvar este documento.',
            409: 'O conteúdo mudou em outra sessão. Reabra antes de tentar novamente.',
            419: 'Sua sessão expirou. Recarregue a página antes de tentar novamente.',
            422: 'O conteúdo não pôde ser validado. Revise antes de tentar novamente.',
            429: 'Muitas tentativas. Aguarde antes de tentar novamente.',
        };

        throw new DocumentSaveError(
            messages[response.status] ?? 'Não foi possível salvar o documento.',
            response.status >= 500 || [408, 425, 429].includes(response.status),
        );
    }

    let payload: { document?: OpenedDocument } | null;

    try {
        payload = await response.json();
    } catch {
        throw new DocumentSaveError('O servidor não confirmou o salvamento.');
    }

    const saved = payload?.document;

    if (
        !saved ||
        saved.id !== document.id ||
        !Number.isSafeInteger(saved.revision) ||
        saved.revision <= document.revision ||
        saved.content !== content
    ) {
        throw new DocumentSaveError('O servidor não confirmou o salvamento.');
    }

    return saved;
}
