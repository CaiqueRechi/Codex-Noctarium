import type { Viewport } from '@xyflow/react';

export async function saveWorkspaceState(
    endpoint: string,
    viewport: Viewport,
    focusEntityId: string | null,
): Promise<void> {
    const token = document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content');

    if (!token) {
        throw new Error('Token CSRF indisponível. Recarregue a página.');
    }

    const response = await fetch(endpoint, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': token,
        },
        body: JSON.stringify({
            viewport,
            focus_entity_id: focusEntityId,
        }),
    });

    if (!response.ok) {
        const payload = (await response.json()) as { message?: string };

        throw new Error(
            payload.message ?? 'Não foi possível salvar o enquadramento.',
        );
    }
}
