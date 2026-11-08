import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    DocumentSaveError,
    requestDocumentSave,
} from '../documents/save-request';
import type { OpenedDocument } from '../documents/types';

const note: OpenedDocument = {
    id: 'note/id',
    title: 'Nota',
    content: 'before',
    revision: 1,
    entityType: null,
    properties: {},
};

describe('RF-06 confirmed save and security', () => {
    afterEach(() => {
        document.cookie = 'XSRF-TOKEN=; max-age=0; path=/';
        vi.unstubAllGlobals();
    });

    it('sends a same-origin CSRF-protected PATCH with the expected revision', async () => {
        document.cookie = 'XSRF-TOKEN=csrf-token; path=/';
        const saved = { ...note, content: 'after', revision: 2 };
        const fetchMock = vi
            .fn()
            .mockResolvedValue(Response.json({ document: saved }));
        vi.stubGlobal('fetch', fetchMock);
        await expect(
            requestDocumentSave('/vault/documents', note, 'after'),
        ).resolves.toEqual(saved);
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            '/vault/documents/note%2Fid',
            {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': 'csrf-token',
                },
                body: JSON.stringify({ content: 'after', revision: 1 }),
            },
        );
    });

    it.each([401, 403, 404, 409, 419, 422])(
        'stops immediately for HTTP %s without exposing server details',
        async (status) => {
            document.cookie = 'XSRF-TOKEN=csrf-token; path=/';
            vi.stubGlobal(
                'fetch',
                vi
                    .fn()
                    .mockResolvedValue(
                        new Response('private server secret', { status }),
                    ),
            );
            const error = await requestDocumentSave(
                '/vault/documents',
                note,
                'after',
            ).catch((exception: unknown) => exception);
            expect(error).toBeInstanceOf(DocumentSaveError);
            expect(error).toMatchObject({ retryable: false });
            expect((error as Error).message).not.toContain(
                'private server secret',
            );
        },
    );

    it.each([408, 425, 429, 500, 503])(
        'permits a bounded retry for HTTP %s',
        async (status) => {
            document.cookie = 'XSRF-TOKEN=csrf-token; path=/';
            vi.stubGlobal(
                'fetch',
                vi
                    .fn()
                    .mockResolvedValue(
                        new Response('private server secret', { status }),
                    ),
            );
            await expect(
                requestDocumentSave('/vault/documents', note, 'after'),
            ).rejects.toMatchObject({ retryable: true });
        },
    );

    it('handles network failures without exposing their details', async () => {
        document.cookie = 'XSRF-TOKEN=csrf-token; path=/';
        vi.stubGlobal(
            'fetch',
            vi.fn().mockRejectedValue(new TypeError('private url')),
        );
        await expect(
            requestDocumentSave('/vault/documents', note, 'after'),
        ).rejects.toMatchObject({
            retryable: true,
            message: 'Não foi possível conectar para salvar.',
        });
    });

    it('does not send a mutation when the CSRF cookie is missing', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        await expect(
            requestDocumentSave('/vault/documents', note, 'after'),
        ).rejects.toThrow('CSRF');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
        null,
        {},
        { document: { ...note, content: 'after' } },
        { document: { ...note, id: 'another', content: 'after', revision: 2 } },
        { document: { ...note, content: 'wrong', revision: 2 } },
        { document: { ...note, content: 'after', revision: '2' } },
    ])(
        'rejects a success response that does not confirm this content and revision: %j',
        async (payload) => {
            document.cookie = 'XSRF-TOKEN=csrf-token; path=/';
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue(Response.json(payload)),
            );
            await expect(
                requestDocumentSave('/vault/documents', note, 'after'),
            ).rejects.toMatchObject({ retryable: false });
        },
    );

    it('rejects an HTML success response without retrying or displaying it', async () => {
        document.cookie = 'XSRF-TOKEN=csrf-token; path=/';
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(new Response('<html>private</html>')),
        );
        await expect(
            requestDocumentSave('/vault/documents', note, 'after'),
        ).rejects.toMatchObject({
            retryable: false,
            message: 'O servidor não confirmou o salvamento.',
        });
    });
});
