import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
    }: {
        children: ReactNode;
        nodes: Array<{ data: { label: string }; hidden?: boolean }>;
        onMove: (
            event: null,
            viewport: { x: number; y: number; zoom: number },
        ) => void;
    }) => (
        <div>
            {nodes
                .filter((node) => !node.hidden)
                .map((node) => (
                    <span key={node.data.label}>{node.data.label}</span>
                ))}
            <button
                type="button"
                onClick={() => onMove(null, { x: 0, y: 0, zoom: 1 })}
            >
                aproximar
            </button>
            {children}
        </div>
    ),
}));

import VaultPage from '../pages/vault';

describe('RF-02 vault canvas', () => {
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
                endpoints={{ documents: '/vault/documents' }}
            />,
        );

        expect(screen.getByText('Meu Universo')).toBeInTheDocument();
        expect(screen.queryByText('Primeiro Contexto')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'aproximar' }));

        expect(screen.getByText('Primeiro Contexto')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('keeps the draft visible and reports failure when saving is rejected', async () => {
        const csrf = document.createElement('meta');
        csrf.name = 'csrf-token';
        csrf.content = 'test-token';
        document.head.append(csrf);
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
                endpoints={{ documents: '/vault/documents' }}
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

        csrf.remove();
        vi.unstubAllGlobals();
    });
});
