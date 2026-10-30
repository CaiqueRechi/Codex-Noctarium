import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setViewportMock = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
}));

vi.mock('@xyflow/react', () => ({
    Background: () => null,
    BackgroundVariant: { Dots: 'dots' },
    Controls: () => null,
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
    ReactFlow: ({
        children,
        nodes,
        onMove,
        onInit,
        onNodeDoubleClick,
    }: {
        children: ReactNode;
        nodes: Array<{
            id: string;
            data: { label: string; kind: string };
            hidden?: boolean;
        }>;
        onMove: (
            event: null,
            viewport: { x: number; y: number; zoom: number },
        ) => void;
        onInit?: (instance: { setViewport: typeof setViewportMock }) => void;
        onNodeDoubleClick?: (
            event: MouseEvent,
            node: {
                id: string;
                data: { label: string; kind: string };
            },
        ) => void;
    }) => {
        useEffect(() => {
            onInit?.({ setViewport: setViewportMock });
        }, [onInit]);

        return (
            <div>
                {nodes
                    .filter((node) => !node.hidden)
                    .map((node) => (
                        <span
                            key={node.id}
                            onDoubleClick={(event) =>
                                onNodeDoubleClick?.(
                                    event.nativeEvent,
                                    node,
                                )
                            }
                        >
                            {node.data.label}
                        </span>
                    ))}
                <button
                    type="button"
                    onClick={() => onMove(null, { x: 0, y: 0, zoom: 1 })}
                >
                    aproximar
                </button>
                {children}
            </div>
        );
    },
}));

import VaultPage from '../pages/vault';

describe('RF-02 vault canvas', () => {
    beforeEach(() => {
        setViewportMock.mockReset();
    });

    it('reveals context detail through zoom without entering edit mode', () => {
        render(
            <VaultPage
                vault={{
                    id: 'vault-1',
                    name: 'CVC',
                    universes: [
                        {
                            id: 'universe-1',
                            name: 'Meu Universo',
                            contexts: [
                                {
                                    id: 'context-1',
                                    name: 'Primeiro Contexto',
                                    documents: [],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 120, y: 120, zoom: 0.65 },
                    focusEntityId: null,
                }}
            />,
        );

        expect(screen.getByText('Meu Universo')).toBeInTheDocument();
        expect(screen.queryByText('Primeiro Contexto')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'aproximar' }));

        expect(screen.getByText('Primeiro Contexto')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('keeps the draft visible and reports failure when saving is rejected', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    document: {
                        id: 'document-1',
                        title: null,
                        content: '',
                        revision: 1,
                    },
                }),
            })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Falha de armazenamento.' }),
            });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <VaultPage
                vault={{
                    id: 'vault-1',
                    name: 'CVC',
                    universes: [
                        {
                            id: 'universe-1',
                            name: 'Meu Universo',
                            contexts: [
                                {
                                    id: 'context-1',
                                    name: 'Primeiro Contexto',
                                    documents: [],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 120, y: 120, zoom: 0.65 },
                    focusEntityId: null,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Nova nota' }));
        const editor = await screen.findByRole('textbox', {
            name: 'Conteúdo Markdown',
        });
        fireEvent.change(editor, { target: { value: '# rascunho pendente' } });
        fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

        await waitFor(() =>
            expect(screen.getByRole('alert')).toHaveTextContent(
                'Falha de armazenamento.',
            ),
        );
        expect(editor).toHaveValue('# rascunho pendente');
        expect(
            screen.getByRole('button', { name: 'Voltar ao canvas' }),
        ).toBeDisabled();

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });

    it('returns to the persisted viewport without undoing the document', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    document: {
                        id: 'document-1',
                        title: null,
                        content: '# conteúdo confirmado',
                        revision: 4,
                    },
                }),
            })
            .mockResolvedValueOnce({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        const persistedViewport = { x: -180.75, y: 41.5, zoom: 1.6 };

        render(
            <VaultPage
                vault={{
                    id: 'vault-1',
                    name: 'CVC',
                    universes: [
                        {
                            id: 'universe-1',
                            name: 'Meu Universo',
                            contexts: [
                                {
                                    id: 'context-1',
                                    name: 'Primeiro Contexto',
                                    documents: [
                                        {
                                            id: 'document-1',
                                            title: null,
                                            revision: 4,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: persistedViewport,
                    focusEntityId: 'document-1',
                }}
            />,
        );

        fireEvent.doubleClick(screen.getByText('Sem título'));
        expect(
            await screen.findByDisplayValue('# conteúdo confirmado'),
        ).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole('button', { name: 'Voltar ao canvas' }),
        );

        expect(setViewportMock).toHaveBeenCalledWith(persistedViewport);

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });
});
