import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { visit, reload, setViewport } = vi.hoisted(() => ({
    visit: vi.fn(),
    reload: vi.fn(),
    setViewport: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { visit, reload },
}));
vi.mock('@xyflow/react', () => ({
    Background: () => null,
    BackgroundVariant: { Dots: 'dots' },
    Controls: () => null,
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
    ReactFlow: ({
        onInit,
        onNodeDoubleClick,
    }: {
        onInit: (flow: unknown) => void;
        onNodeDoubleClick: (event: null, node: unknown) => void;
    }) => {
        useEffect(() => {
            onInit({ setViewport });
        }, [onInit]);

        return (
            <button
                onClick={() =>
                    onNodeDoubleClick(null, {
                        data: { kind: 'document', entityId: 'note' },
                    })
                }
            >
                Abrir documento
            </button>
        );
    },
}));

import VaultPage from '../pages/vault';
import type { VaultPageProps } from '../pages/vault';

const note = {
    id: 'note',
    title: 'Nota',
    content: 'original',
    revision: 1,
    entityType: null,
    properties: {},
};
const props: VaultPageProps = {
    navigation: { home: '/dashboard' },
    vault: {
        id: 'vault',
        name: 'Vault',
        breadcrumbs: [{ id: 'context', name: 'Contexto' }],
        universes: [{ id: 'context', name: 'Contexto', documents: [note] }],
        perspectives: [
            {
                id: 'perspective',
                name: 'Principal',
                sourcePerspectiveId: null,
                filters: { contextIds: [], entityTypes: [] },
                layouts: [],
                versions: [
                    {
                        id: 'version',
                        perspectiveId: 'perspective',
                        name: 'Marco',
                        kind: 'named',
                        createdAt: '2026-11-08T00:00:00-03:00',
                    },
                ],
            },
        ],
    },
    endpoints: {
        documents: '/vault/documents',
        entities: '/vault/entities',
        workspace: '/vault/workspace',
        contexts: '/vault/contexts',
        versions: '/vault/versions',
        trash: '/vault/trash',
    },
    workspace: { viewport: { x: 1, y: 2, zoom: 1.4 }, focusEntityId: 'note' },
};

async function tick(milliseconds = 0) {
    await act(() => vi.advanceTimersByTimeAsync(milliseconds));
}

async function openEditor(saveResponse: () => Promise<Response>) {
    const saves = vi.fn(saveResponse);
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
        if (url === '/vault/documents/note' && options?.method === 'PATCH') {
            return saves();
        }

        if (url === '/vault/documents/note') {
            return Promise.resolve(Response.json({ document: note }));
        }

        return Promise.resolve(Response.json({}));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
        <StrictMode>
            <VaultPage {...props} />
        </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir documento' }));
    await tick();

    return {
        saves,
        fetchMock,
        editor: screen.getByRole('textbox', { name: 'Conteúdo Markdown' }),
    };
}

describe('RF-06 editor integration and navigation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        document.cookie = 'XSRF-TOKEN=csrf; path=/';
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.cookie = 'XSRF-TOKEN=; max-age=0; path=/';
    });

    it('autosaves the real editor, warns only while dirty and never stores a draft in browser storage', async () => {
        const localWrite = vi.spyOn(Storage.prototype, 'setItem');
        const databaseOpen = vi.fn();
        vi.stubGlobal('indexedDB', { open: databaseOpen });
        const { editor, saves } = await openEditor(async () =>
            Response.json({
                document: {
                    ...note,
                    content: '<script>private</script>',
                    revision: 2,
                },
            }),
        );
        const clean = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(clean);
        expect(clean.defaultPrevented).toBe(false);
        fireEvent.change(editor, {
            target: { value: '<script>private</script>' },
        });
        const dirty = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(dirty);
        expect(dirty.defaultPrevented).toBe(true);
        await tick(1499);
        expect(saves).not.toHaveBeenCalled();
        await tick(1);
        expect(saves).toHaveBeenCalledTimes(1);
        expect(
            within(
                screen.getByRole('region', { name: 'Editor Markdown' }),
            ).getByRole('status'),
        ).toHaveAttribute('data-state', 'saved');
        const saved = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(saved);
        expect(saved.defaultPrevented).toBe(false);
        expect(document.querySelector('script')).toBeNull();
        expect(localWrite).not.toHaveBeenCalled();
        expect(databaseOpen).not.toHaveBeenCalled();
    });

    it('saves immediately on Back and keeps the editor open until the response arrives', async () => {
        let confirm!: (response: Response) => void;
        const response = new Promise<Response>((resolve) => {
            confirm = resolve;
        });
        const { editor, saves } = await openEditor(() => response);
        fireEvent.change(editor, { target: { value: 'edited' } });
        fireEvent.click(
            screen.getByRole('button', { name: 'Voltar ao canvas' }),
        );
        await tick();
        expect(saves).toHaveBeenCalledTimes(1);
        expect(editor).toBeInTheDocument();
        expect(setViewport).not.toHaveBeenCalled();
        await act(async () => {
            confirm(
                Response.json({
                    document: { ...note, content: 'edited', revision: 2 },
                }),
            );
        });
        expect(
            screen.queryByRole('textbox', { name: 'Conteúdo Markdown' }),
        ).toBeNull();
        expect(setViewport).toHaveBeenCalledWith(props.workspace.viewport);
    });

    it('stops the activity indicator at the third failure and retries only after the user asks', async () => {
        const { editor, saves } = await openEditor(
            async () => new Response('server secret', { status: 503 }),
        );
        fireEvent.change(editor, { target: { value: 'private draft' } });
        await tick(1500);
        expect(screen.getByText('Salvando…')).toHaveAttribute(
            'aria-busy',
            'true',
        );
        await tick(1500);
        expect(screen.getByText('Salvando…')).toHaveAttribute(
            'data-state',
            'saving',
        );
        await tick(1500);
        expect(saves).toHaveBeenCalledTimes(3);
        expect(screen.getByText('Falhou')).toHaveAttribute(
            'aria-busy',
            'false',
        );
        expect(screen.getByRole('alert')).toHaveTextContent('apenas nesta aba');
        expect(screen.getByRole('alert')).not.toHaveTextContent(
            'server secret',
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Voltar ao canvas' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Voltar ao Rechi OS' }),
        );
        await tick(10000);
        fireEvent.click(
            screen.getByRole('button', { name: 'Voltar ao Rechi OS' }),
        );
        expect(visit).not.toHaveBeenCalled();
        expect(saves).toHaveBeenCalledTimes(3);
        expect(editor).toHaveValue('private draft');
        saves.mockResolvedValue(
            Response.json({
                document: { ...note, content: 'private draft', revision: 2 },
            }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Tentar novamente' }),
        );
        await tick();
        expect(saves).toHaveBeenCalledTimes(4);
        expect(screen.getByText('Salvo')).toHaveAttribute(
            'data-state',
            'saved',
        );
    });

    it('waits for saving before returning to Rechi OS', async () => {
        const { editor, saves } = await openEditor(async () =>
            Response.json({
                document: { ...note, content: 'edited', revision: 2 },
            }),
        );
        fireEvent.change(editor, { target: { value: 'edited' } });
        fireEvent.click(
            screen.getByRole('button', { name: 'Voltar ao Rechi OS' }),
        );
        expect(visit).not.toHaveBeenCalled();
        await tick();
        expect(saves).toHaveBeenCalledTimes(1);
        expect(visit).toHaveBeenCalledExactlyOnceWith('/dashboard');
    });

    it('postpones an Inertia visit without losing its destination or duplicating the save', async () => {
        const { editor, saves } = await openEditor(async () =>
            Response.json({
                document: { ...note, content: 'edited', revision: 2 },
            }),
        );
        fireEvent.change(editor, { target: { value: 'edited' } });
        const originalVisit = {
            url: new URL('http://localhost/dashboard'),
            method: 'get',
        };
        const navigate = () => {
            const event = new CustomEvent('inertia:before', {
                cancelable: true,
                detail: { visit: originalVisit },
            });
            document.dispatchEvent(event);

            return event;
        };
        expect(navigate().defaultPrevented).toBe(true);
        expect(navigate().defaultPrevented).toBe(true);
        await tick();
        expect(saves).toHaveBeenCalledTimes(1);
        expect(visit).toHaveBeenCalledExactlyOnceWith(
            originalVisit.url,
            originalVisit,
        );
    });

    it('blocks a context switch when a revision conflict prevents the required save', async () => {
        const { editor, saves, fetchMock } = await openEditor(
            async () => new Response('secret', { status: 409 }),
        );
        fireEvent.change(editor, { target: { value: 'edited' } });
        fireEvent.click(screen.getByRole('button', { name: 'Vault' }));
        await tick();
        expect(saves).toHaveBeenCalledTimes(1);
        expect(
            fetchMock.mock.calls.some(([url]) =>
                url.includes('/vault/contexts'),
            ),
        ).toBe(false);
        expect(editor).toHaveValue('edited');
        expect(screen.getByRole('alert')).toHaveTextContent('outra sessão');
    });

    it.each(['Restaurar', 'Mover selecionado para a lixeira'])(
        'does not perform %s when saving the pending note fails',
        async (action) => {
            vi.spyOn(window, 'confirm').mockReturnValue(true);
            const { editor, fetchMock } = await openEditor(
                async () => new Response(null, { status: 403 }),
            );
            fireEvent.change(editor, { target: { value: 'private draft' } });
            fireEvent.click(screen.getByRole('button', { name: action }));
            await tick();
            expect(
                fetchMock.mock.calls.some(
                    ([url, options]) =>
                        url.includes('/vault/versions/') ||
                        options?.method === 'DELETE',
                ),
            ).toBe(false);
            expect(reload).not.toHaveBeenCalled();
            expect(editor).toHaveValue('private draft');
        },
    );

    it('retains the exit warning and manual retry when typing back to the old content after a conflict', async () => {
        const { editor } = await openEditor(
            async () => new Response(null, { status: 409 }),
        );
        fireEvent.change(editor, { target: { value: 'edited' } });
        await tick(1500);
        fireEvent.change(editor, { target: { value: 'original' } });
        const unload = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(unload);
        expect(unload.defaultPrevented).toBe(true);
        expect(
            screen.getByRole('button', { name: 'Tentar novamente' }),
        ).toBeEnabled();
        expect(screen.getByText('Falhou')).toHaveAttribute(
            'data-state',
            'failed',
        );
    });
});
