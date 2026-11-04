import { xsrfHeaders } from '../http/csrf';
import type { VersionSummary } from '../perspectives/types';

async function mutation(url: string, init: RequestInit): Promise<Response> {
    const response = await fetch(url, {
        ...init,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...xsrfHeaders(),
            ...init.headers,
        },
    });

    if (!response.ok) {
        const payload = (await response.json()) as { message?: string };

        throw new Error(
            payload.message ?? 'Não foi possível concluir o versionamento.',
        );
    }

    return response;
}

export async function createVersion(
    perspectivesEndpoint: string,
    perspectiveId: string,
    name: string,
): Promise<VersionSummary> {
    const response = await mutation(
        `${perspectivesEndpoint}/${encodeURIComponent(perspectiveId)}/versions`,
        {
            method: 'POST',
            body: JSON.stringify({ name }),
        },
    );
    const payload = (await response.json()) as { version: VersionSummary };

    return payload.version;
}

export async function restoreVersion(
    versionsEndpoint: string,
    versionId: string,
): Promise<VersionSummary> {
    const response = await mutation(
        `${versionsEndpoint}/${encodeURIComponent(versionId)}/restore`,
        { method: 'POST', body: JSON.stringify({}) },
    );
    const payload = (await response.json()) as {
        recoveryVersion: VersionSummary;
    };

    return payload.recoveryVersion;
}
