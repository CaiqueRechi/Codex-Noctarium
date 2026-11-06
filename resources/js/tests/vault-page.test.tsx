import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setViewportMock = vi.fn();
const fitViewMock = vi.fn().mockResolvedValue(true);
const getViewportMock = vi.fn(() => ({ x: -40, y: 25, zoom: 1.4 }));
const { routerReloadMock } = vi.hoisted(() => ({
    routerReloadMock: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { reload: routerReloadMock },
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
        onMoveEnd,
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
        onMoveEnd?: (
            event: MouseEvent | TouchEvent | null,
            viewport: { x: number; y: number; zoom: number },
        ) => void;
        onInit?: (instance: {
            setViewport: typeof setViewportMock;
            fitView: typeof fitViewMock;
            getViewport: typeof getViewportMock;
        }) => void;
        onNodeDoubleClick?: (
            event: MouseEvent,
            node: {
                id: string;
                data: { label: string; kind: string };
            },
        ) => void;
    }) => {
        useEffect(() => {
            onInit?.({
                setViewport: setViewportMock,
                fitView: fitViewMock,
                getViewport: getViewportMock,
            });
        }, [onInit]);

        return (
            <div>
                {nodes
                    .filter((node) => !node.hidden)
                    .map((node) => (
                        <span
                            key={node.id}
                            onDoubleClick={(event) =>
                                onNodeDoubleClick?.(event.nativeEvent, node)
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
                <button
                    type="button"
                    onClick={() => onMoveEnd?.(null, { x: 0, y: 0, zoom: 1 })}
                >
                    enquadramento programático
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
        fitViewMock.mockClear();
        getViewportMock.mockClear();
        routerReloadMock.mockReset();
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
                    entities: '/vault/entities',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 120, y: 120, zoom: 0.65 },
                    focusEntityId: null,
                }}
            />,
        );

        const canvas = screen.getByRole('main', { name: 'Canvas do vault' });

        expect(within(canvas).getByText('Meu Universo')).toBeInTheDocument();
        expect(
            within(canvas).queryByText('Primeiro Contexto'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'aproximar' }));

        expect(
            within(canvas).getByText('Primeiro Contexto'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: 'Conteúdo Markdown' }),
        ).not.toBeInTheDocument();
    });

    it('enters a context slice without loading the full hierarchy', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    slice: {
                        contexts: [
                            {
                                id: 'universe-1',
                                parentId: null,
                                kind: 'universe',
                                name: 'Meu Universo',
                                hasChildren: true,
                                documents: [],
                                contexts: [
                                    {
                                        id: 'context-1',
                                        parentId: 'universe-1',
                                        kind: 'context',
                                        name: 'Primeiro Contexto',
                                        hasChildren: false,
                                        documents: [],
                                        contexts: [],
                                    },
                                ],
                            },
                        ],
                        breadcrumbs: [
                            { id: 'universe-1', name: 'Meu Universo' },
                        ],
                    },
                }),
            })
            .mockResolvedValueOnce({ ok: true });
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
                            contexts: [],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    contexts: '/vault/contexts',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 120, y: 120, zoom: 0.65 },
                    focusEntityId: null,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

        await waitFor(() =>
            expect(
                within(
                    screen.getByRole('navigation', { name: 'Caminho atual' }),
                ).getByRole('button', { name: 'Meu Universo' }),
            ).toBeInTheDocument(),
        );
        expect(screen.getByLabelText('Novo subassunto')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/vault/contexts/universe-1',
            expect.objectContaining({ credentials: 'same-origin' }),
        );

        vi.unstubAllGlobals();
    });

    it('creates a child under the active context and refreshes its slice', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    context: {
                        id: 'context-2',
                        parentId: 'context-1',
                        kind: 'context',
                        name: 'Subassunto',
                        hasChildren: false,
                        documents: [],
                        contexts: [],
                    },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    slice: {
                        contexts: [
                            {
                                id: 'context-1',
                                parentId: 'universe-1',
                                kind: 'context',
                                name: 'Primeiro Contexto',
                                hasChildren: true,
                                documents: [],
                                contexts: [
                                    {
                                        id: 'context-2',
                                        parentId: 'context-1',
                                        kind: 'context',
                                        name: 'Subassunto',
                                        hasChildren: false,
                                        documents: [],
                                        contexts: [],
                                    },
                                ],
                            },
                        ],
                        breadcrumbs: [
                            { id: 'universe-1', name: 'Meu Universo' },
                            {
                                id: 'context-1',
                                name: 'Primeiro Contexto',
                            },
                        ],
                    },
                }),
            });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <VaultPage
                vault={{
                    id: 'vault-1',
                    name: 'CVC',
                    breadcrumbs: [
                        { id: 'universe-1', name: 'Meu Universo' },
                        { id: 'context-1', name: 'Primeiro Contexto' },
                    ],
                    universes: [
                        {
                            id: 'context-1',
                            name: 'Primeiro Contexto',
                            contexts: [],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    contexts: '/vault/contexts',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 120, y: 120, zoom: 0.65 },
                    focusEntityId: null,
                    focusContextId: 'context-1',
                }}
            />,
        );

        fireEvent.change(screen.getByLabelText('Novo subassunto'), {
            target: { value: 'Subassunto' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

        await waitFor(() =>
            expect(screen.getByText('Subassunto')).toBeInTheDocument(),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/vault/contexts',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    name: 'Subassunto',
                    parent_id: 'context-1',
                }),
            }),
        );

        vi.unstubAllGlobals();
    });

    it('does not persist a viewport change emitted programmatically', () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
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
                    entities: '/vault/entities',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 120, y: 120, zoom: 0.65 },
                    focusEntityId: null,
                }}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'enquadramento programático',
            }),
        );

        expect(fetchMock).not.toHaveBeenCalled();
        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
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
                        entityType: null,
                        properties: {},
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
                    entities: '/vault/entities',
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
                        entityType: null,
                        properties: {},
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
                                            entityType: null,
                                            properties: {},
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: persistedViewport,
                    focusEntityId: 'document-1',
                }}
            />,
        );

        fireEvent.doubleClick(
            within(
                screen.getByRole('main', { name: 'Canvas do vault' }),
            ).getByText('Sem título'),
        );
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

    it('locates one stable entity through each context in the explorer', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
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
                                    name: 'Projetos',
                                    documents: [
                                        {
                                            id: 'entity-shared',
                                            title: 'Conhecimento compartilhado',
                                            revision: 1,
                                            entityType: null,
                                            properties: {},
                                        },
                                    ],
                                },
                                {
                                    id: 'context-2',
                                    name: 'Estudos',
                                    documents: [
                                        {
                                            id: 'entity-shared',
                                            title: 'Conhecimento compartilhado',
                                            revision: 1,
                                            entityType: null,
                                            properties: {},
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 0.65 },
                    focusEntityId: null,
                }}
            />,
        );

        const explorer = screen.getByRole('complementary', {
            name: 'Explorador do vault',
        });
        const sharedEntityLocations = within(explorer).getAllByRole('button', {
            name: 'DocumentoConhecimento compartilhado',
        });

        expect(sharedEntityLocations).toHaveLength(2);
        fireEvent.click(sharedEntityLocations[1]);

        await waitFor(() =>
            expect(fitViewMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    nodes: [{ id: 'entity:context-2:entity-shared' }],
                }),
            ),
        );
        expect(fetchMock).toHaveBeenCalledWith(
            '/vault/workspace',
            expect.objectContaining({ method: 'PATCH' }),
        );

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });

    it('updates type and properties without replacing the focused entity', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                entity: {
                    id: 'entity-1',
                    title: 'Registro',
                    revision: 3,
                    entityType: 'referência',
                    properties: { status: 'ativo' },
                },
            }),
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
                                    name: 'Projetos',
                                    documents: [
                                        {
                                            id: 'entity-1',
                                            title: 'Registro',
                                            revision: 3,
                                            entityType: null,
                                            properties: {},
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 1.4 },
                    focusEntityId: 'entity-1',
                }}
            />,
        );

        fireEvent.change(screen.getByRole('textbox', { name: 'Tipo' }), {
            target: { value: 'referência' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Adicionar propriedade' }),
        );
        fireEvent.change(screen.getByRole('textbox', { name: 'Nome 1' }), {
            target: { value: 'status' },
        });
        fireEvent.change(screen.getByRole('textbox', { name: 'Valor 1' }), {
            target: { value: 'ativo' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Salvar propriedades' }),
        );

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/vault/entities/entity-1',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        type: 'referência',
                        properties: { status: 'ativo' },
                        tags: [],
                    }),
                }),
            ),
        );
        expect(screen.getByRole('textbox', { name: 'Tipo' })).toHaveValue(
            'referência',
        );

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });

    it('reuses a focused entity and creates a global relation', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    relation: {
                        id: 'relation-1',
                        sourceEntityId: 'entity-1',
                        targetEntityId: 'entity-2',
                        contextId: null,
                        relationType: null,
                        isDirected: false,
                        properties: {},
                    },
                }),
            });
        vi.stubGlobal('fetch', fetchMock);

        const summary = (id: string, title: string) => ({
            id,
            title,
            revision: 1,
            entityType: null,
            properties: {},
        });

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
                                    name: 'Projetos',
                                    documents: [
                                        summary('entity-1', 'Origem'),
                                        summary('entity-2', 'Destino'),
                                    ],
                                },
                                {
                                    id: 'context-2',
                                    name: 'Estudos',
                                    documents: [],
                                },
                            ],
                        },
                    ],
                    relations: [],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    contexts: '/vault/contexts',
                    relations: '/vault/relations',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 1.4 },
                    focusEntityId: 'entity-1',
                }}
            />,
        );

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Reutilizar em contexto' }),
            { target: { value: 'context-2' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Adicionar ao contexto' }),
        );
        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/vault/contexts/context-2/entities',
                expect.objectContaining({ method: 'POST' }),
            ),
        );

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Relacionar com' }),
            {
                target: { value: 'entity-2' },
            },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Criar relação' }));
        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/vault/relations',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        source_entity_id: 'entity-1',
                        target_entity_id: 'entity-2',
                        context_id: null,
                        type: null,
                        directed: false,
                        properties: {},
                    }),
                }),
            ),
        );

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });

    it('creates a derived perspective from the active configuration', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                perspective: {
                    id: 'perspective-derived',
                    name: 'Apresentação',
                    sourcePerspectiveId: 'perspective-source',
                    filters: {
                        contextIds: ['context-1'],
                        entityTypes: ['referência'],
                    },
                    layouts: [],
                },
            }),
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
                                    name: 'Projetos',
                                    documents: [],
                                },
                            ],
                        },
                    ],
                    perspectives: [
                        {
                            id: 'perspective-source',
                            name: 'Arquitetura',
                            sourcePerspectiveId: null,
                            filters: {
                                contextIds: ['context-1'],
                                entityTypes: ['referência'],
                            },
                            layouts: [],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    perspectives: '/vault/perspectives',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 1.4 },
                    focusEntityId: null,
                    perspectiveId: 'perspective-source',
                }}
            />,
        );

        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Nome da nova perspectiva',
            }),
            { target: { value: 'Apresentação' } },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Derivar atual' }));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/vault/perspectives',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        name: 'Apresentação',
                        source_perspective_id: 'perspective-source',
                        filters: {
                            context_ids: ['context-1'],
                            entity_types: ['referência'],
                        },
                    }),
                }),
            ),
        );

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });

    it('creates and restores a named version', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const version = {
            id: 'version-1',
            perspectiveId: 'perspective-1',
            name: 'Marco inicial',
            kind: 'named' as const,
            createdAt: '2026-11-04T16:00:00-03:00',
        };
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ version }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    recoveryVersion: {
                        ...version,
                        id: 'version-recovery',
                        kind: 'recovery',
                    },
                }),
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
                                    name: 'Projetos',
                                    documents: [],
                                },
                            ],
                        },
                    ],
                    perspectives: [
                        {
                            id: 'perspective-1',
                            name: 'Principal',
                            sourcePerspectiveId: null,
                            filters: { contextIds: [], entityTypes: [] },
                            layouts: [],
                            versions: [],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    perspectives: '/vault/perspectives',
                    versions: '/vault/versions',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 1.4 },
                    focusEntityId: null,
                    perspectiveId: 'perspective-1',
                }}
            />,
        );

        fireEvent.change(
            screen.getByRole('textbox', { name: 'Nome da versão' }),
            {
                target: { value: 'Marco inicial' },
            },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Criar versão' }));

        expect(
            await screen.findByRole('button', { name: 'Restaurar' }),
        ).toBeInTheDocument();
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/vault/perspectives/perspective-1/versions',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'Marco inicial' }),
            }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
        await waitFor(() =>
            expect(fetchMock).toHaveBeenNthCalledWith(
                2,
                '/vault/versions/version-1/restore',
                expect.objectContaining({ method: 'POST' }),
            ),
        );
        expect(routerReloadMock).toHaveBeenCalledWith({
            only: ['vault', 'workspace'],
        });

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });

    it('searches the authorized vault and locates the selected result', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        {
                            id: 'entity-1',
                            contextId: 'context-1',
                            title: 'Mapa JWT',
                            snippet: 'Autenticação segura',
                            entityType: 'referência',
                            tags: ['segurança'],
                        },
                    ],
                }),
            })
            .mockResolvedValue({ ok: true });
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
                                    name: 'Projetos',
                                    documents: [
                                        {
                                            id: 'entity-1',
                                            title: 'Mapa JWT',
                                            revision: 2,
                                            entityType: 'referência',
                                            properties: {},
                                            tags: ['segurança'],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    search: '/vault/search',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 1.4 },
                    focusEntityId: null,
                }}
            />,
        );

        fireEvent.change(
            screen.getByRole('searchbox', { name: 'Buscar no vault' }),
            { target: { value: 'JWT' } },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

        const result = await screen.findByRole('button', {
            name: /Mapa JWT/,
        });
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            'http://localhost:3000/vault/search?q=JWT',
            expect.objectContaining({ credentials: 'same-origin' }),
        );

        fireEvent.click(result);

        await waitFor(() =>
            expect(fitViewMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    nodes: [{ id: 'entity:context-1:entity-1' }],
                }),
            ),
        );

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });

    it('moves a focused entity to trash and restores it in its context', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    trashItem: {
                        id: 'entity-1',
                        title: 'Registro recuperável',
                        deletedAt: '2026-11-05T10:00:00-03:00',
                    },
                    deletedRelationIds: [],
                }),
            })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    entity: {
                        id: 'entity-1',
                        title: 'Registro recuperável',
                        revision: 2,
                        entityType: null,
                        properties: {},
                        tags: [],
                    },
                    memberships: [
                        {
                            contextId: 'context-1',
                            position: { x: 30, y: 45 },
                            isPinned: true,
                        },
                    ],
                    restoredRelations: [],
                    brokenRelations: [],
                }),
            });
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(window, 'confirm').mockReturnValue(true);

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
                                    name: 'Projetos',
                                    documents: [
                                        {
                                            id: 'entity-1',
                                            title: 'Registro recuperável',
                                            revision: 2,
                                            entityType: null,
                                            properties: {},
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    trash: [],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    trash: '/vault/trash',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 1.4 },
                    focusEntityId: 'entity-1',
                }}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Mover selecionado para a lixeira',
            }),
        );
        const restoreButton = await screen.findByRole('button', {
            name: 'Restaurar',
        });
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/vault/entities/entity-1',
            expect.objectContaining({ method: 'DELETE' }),
        );

        fireEvent.click(restoreButton);

        await waitFor(() =>
            expect(fetchMock).toHaveBeenNthCalledWith(
                3,
                '/vault/trash/entity-1/restore',
                expect.objectContaining({ method: 'POST' }),
            ),
        );
        expect(
            await screen.findByText('Entidade e relações válidas restauradas.'),
        ).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('complementary', {
                    name: 'Explorador do vault',
                }),
            ).getByRole('button', {
                name: 'DocumentoRegistro recuperável',
            }),
        ).toBeInTheDocument();

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('uploads a private attachment for the focused document', async () => {
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                attachment: {
                    id: 'attachment-1',
                    name: 'manual.pdf',
                    mimeType: 'application/pdf',
                    sizeBytes: 2048,
                },
            }),
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
                                    name: 'Projetos',
                                    documents: [
                                        {
                                            id: 'entity-1',
                                            title: 'Documento',
                                            revision: 1,
                                            entityType: null,
                                            properties: {},
                                            attachments: [],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                endpoints={{
                    documents: '/vault/documents',
                    entities: '/vault/entities',
                    attachments: '/vault/attachments',
                    workspace: '/vault/workspace',
                }}
                workspace={{
                    viewport: { x: 0, y: 0, zoom: 1.4 },
                    focusEntityId: 'entity-1',
                }}
            />,
        );

        const file = new File(['%PDF-1.4\n%%EOF'], 'manual.pdf', {
            type: 'application/pdf',
        });
        fireEvent.change(screen.getByLabelText('Selecionar anexo'), {
            target: { files: [file] },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));

        const link = await screen.findByRole('link', { name: 'manual.pdf' });
        expect(link).toHaveAttribute('href', '/vault/attachments/attachment-1');
        expect(fetchMock).toHaveBeenCalledWith(
            '/vault/entities/entity-1/attachments',
            expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData),
            }),
        );

        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        vi.unstubAllGlobals();
    });
});
