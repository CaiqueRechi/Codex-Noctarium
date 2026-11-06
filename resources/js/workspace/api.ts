import type { Viewport } from '@xyflow/react';
import { xsrfHeaders } from '../http/csrf';

export async function saveWorkspaceState(
    endpoint: string,
    viewport: Viewport,
    focusEntityId: string | null,
    perspectiveId: string | null,
    focusContextId: string | null = null,
): Promise<void> {
    const response = await fetch(endpoint, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...xsrfHeaders(),
        },
        body: JSON.stringify({
            viewport,
            focus_entity_id: focusEntityId,
            perspective_id: perspectiveId,
            focus_context_id: focusContextId,
        }),
    });

    if (!response.ok) {
        const payload = (await response.json()) as { message?: string };

        throw new Error(
            payload.message ?? 'Não foi possível salvar o enquadramento.',
        );
    }
}
