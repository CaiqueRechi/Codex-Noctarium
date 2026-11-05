import { xsrfHeaders } from '../http/csrf';
import type { AttachmentSummary } from './types';

export async function uploadAttachment(
    entitiesEndpoint: string,
    entityId: string,
    file: File,
): Promise<AttachmentSummary> {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(
        `${entitiesEndpoint}/${encodeURIComponent(entityId)}/attachments`,
        {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                ...xsrfHeaders(),
            },
            body,
        },
    );
    const payload = (await response.json()) as {
        attachment?: AttachmentSummary;
        message?: string;
        errors?: { file?: string[] };
    };

    if (!response.ok || !payload.attachment) {
        throw new Error(
            payload.errors?.file?.[0] ??
                payload.message ??
                'Não foi possível anexar o arquivo.',
        );
    }

    return payload.attachment;
}
