import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { reload: vi.fn() },
}));

type MockNode = {
    id: string;
    type: string;
    position: { x: number; y: number };
    origin?: [number, number];
    width?: number;
    height?: number;
    data: {
        label: string;
        diameter?: number;
        isPinned?: boolean;
        entityId?: string;
        contextId?: string;
    };
};
type DragHandler = (
    event: { ctrlKey: boolean },
    node: MockNode,
    nodes: MockNode[],
) => void;

vi.mock('@xyflow/react', () => ({
    Controls: () => null,
    Handle: () => null,
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
    ReactFlow: ({
        children,
        nodes,
        minZoom,
        maxZoom,
        onMove,
        onNodeDrag,
        onNodeDragStop,
    }: {
        children: ReactNode;
        nodes: MockNode[];
        minZoom: number;
        maxZoom: number;
        onMove: (
            event: null,
            viewport: { x: number; y: number; zoom: number },
        ) => void;
        onNodeDrag: DragHandler;
        onNodeDragStop: DragHandler;
    }) => {
        const dragTo = (node: MockNode, ctrlKey: boolean) => {
            const moved = { ...node, position: { x: 1024, y: -512 } };
            onNodeDrag({ ctrlKey }, moved, [moved]);
            onNodeDragStop({ ctrlKey }, moved, [moved]);
        };

        return (
            <div
                data-testid="canvas-library"
                data-min-zoom={minZoom}
                data-max-zoom={maxZoom}
            >
                {nodes.map((node) => (
                    <span
                        key={node.id}
                        data-testid={node.id}
                        data-type={node.type}
                        data-x={node.position.x}
                        data-y={node.position.y}
                        data-diameter={node.data.diameter}
                        data-origin={node.origin?.join(',')}
                        data-width={node.width}
                        data-height={node.height}
                        data-pinned={String(node.data.isPinned)}
                    >
                        {node.data.label}
                        <button
                            type="button"
                            onClick={() => dragTo(node, false)}
                        >
                            soltar {node.data.label}
                        </button>
                        <button
                            type="button"
                            onClick={() => dragTo(node, true)}
                        >
                            fixar {node.data.label}
                        </button>
                    </span>
                ))}
                <div className="react-flow__pane" data-testid="pane" />
                <button
                    type="button"
                    onClick={() => onMove(null, { x: 0, y: 0, zoom: 0.5 })}
                >
                    afastar
                </button>
                {children}
            </div>
        );
    },
}));

import VaultPage from '../pages/vault';
import type { VaultPageProps } from '../pages/vault';

let pendingFrames: Array<(time: number) => void> = [];
let clock = 0;

function runFrames(count: number): void {
    act(() => {
        for (let index = 0; index < count; index++) {
            const frames = pendingFrames;
            pendingFrames = [];
            clock += 1000 / 60;
            frames.forEach((frame) => frame(clock));
        }
    });
}

function note(id: string, title: string, overrides: object = {}) {
    return {
        id,
        title,
        revision: 1,
        entityType: null,
        properties: {},
        ownContent: 0,
        descendantContent: 0,
        position: null,
        isPinned: false,
        ...overrides,
    };
}

function renderSpace(
    documents: ReturnType<typeof note>[],
    vault: Partial<VaultPageProps['vault']> = {},
) {
    return render(
        <VaultPage
            vault={{
                id: 'vault-1',
                name: 'CVC',
                breadcrumbs: [{ id: 'space', name: 'Planeta' }],
                universes: [
                    {
                        id: 'space',
                        name: 'Planeta',
                        kind: 'context',
                        documents,
                        contexts: [
                            {
                                id: 'nested',
                                name: 'Continente',
                                kind: 'context',
                                parentId: 'space',
                                ownContent: 0,
                                descendantContent: 0,
                                documents: [note('deep', 'Nota do continente')],
                            },
                        ],
                    },
                ],
                ...vault,
            }}
            endpoints={{
                documents: '/vault/documents',
                entities: '/vault/entities',
                contexts: '/vault/contexts',
                workspace: '/vault/workspace',
            }}
            workspace={{
                viewport: { x: 0, y: 0, zoom: 1 },
                focusEntityId: null,
                focusContextId: 'space',
            }}
        />,
    );
}

describe('RF-03 space drawn and moved by the physics', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        pendingFrames = [];
        clock = 0;
        document.cookie = 'XSRF-TOKEN=test-token; path=/';
        fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ updated: true }),
        });
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal(
            'requestAnimationFrame',
            (frame: (time: number) => void) => pendingFrames.push(frame),
        );
        vi.stubGlobal('cancelAnimationFrame', () => {
            pendingFrames = [];
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('draws the notes and nested spaces of the open space as circles', () => {
        renderSpace([note('a', 'Alfa'), note('b', 'Beta')]);

        expect(screen.getByTestId('entity:space:a')).toHaveAttribute(
            'data-type',
            'cosmic',
        );
        expect(screen.getByTestId('entity:space:b')).toBeInTheDocument();
        expect(screen.getByTestId('context:nested')).toHaveAttribute(
            'data-type',
            'cosmic',
        );
    });

    it('leaves the notes of a nested space and the card of the open space out', () => {
        renderSpace([note('a', 'Alfa')]);

        expect(
            screen.queryByTestId('entity:nested:deep'),
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId('context:space')).not.toBeInTheDocument();
        expect(screen.queryByTestId('universe:space')).not.toBeInTheDocument();
    });

    it('gives the note with more content the larger circle', () => {
        renderSpace([
            note('small', 'Pequena', { ownContent: 2 }),
            note('large', 'Grande', { ownContent: 400 }),
        ]);

        const diameterOf = (id: string) =>
            Number(screen.getByTestId(id).getAttribute('data-diameter'));

        expect(diameterOf('entity:space:large')).toBeGreaterThan(
            diameterOf('entity:space:small'),
        );
    });

    it('opens a stored position where it was saved, in canvas units', () => {
        renderSpace([
            note('a', 'Alfa', {
                position: { x: 2048, y: -1024 },
                isPinned: true,
            }),
        ]);

        const node = screen.getByTestId('entity:space:a');

        expect(node).toHaveAttribute('data-x', '2048');
        expect(node).toHaveAttribute('data-y', '-1024');
        expect(node).toHaveAttribute('data-pinned', 'true');
    });

    it('tells the canvas the size of each circle so it stays centred on its position', () => {
        renderSpace([note('a', 'Alfa'), note('b', 'Beta')]);

        const node = screen.getByTestId('entity:space:a');
        const diameter = node.getAttribute('data-diameter');

        expect(Number(diameter)).toBeGreaterThan(0);
        expect(node).toHaveAttribute('data-origin', '0.5,0.5');
        expect(node).toHaveAttribute('data-width', diameter);
        expect(node).toHaveAttribute('data-height', diameter);
    });

    it('moves free notes as frames pass', () => {
        renderSpace([
            note('a', 'Alfa', { position: { x: -2048, y: 0 } }),
            note('b', 'Beta', { position: { x: 2048, y: 0 } }),
        ]);

        runFrames(30);

        expect(
            Number(screen.getByTestId('entity:space:a').getAttribute('data-x')),
        ).toBeGreaterThan(-2048);
    });

    it('saves a note dropped freely without pinning it', async () => {
        renderSpace([note('a', 'Alfa'), note('b', 'Beta')]);

        fireEvent.click(screen.getByRole('button', { name: 'soltar Alfa' }));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/vault/contexts/space/entities/a/layout',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        position: { x: 1024, y: -512 },
                        pinned: false,
                    }),
                }),
            ),
        );
        expect(screen.getByTestId('entity:space:a')).toHaveAttribute(
            'data-pinned',
            'false',
        );
    });

    it('pins a note dropped while Ctrl is held and keeps it where it was dropped', async () => {
        renderSpace([note('a', 'Alfa'), note('b', 'Beta')]);

        fireEvent.click(screen.getByRole('button', { name: 'fixar Alfa' }));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/vault/contexts/space/entities/a/layout',
                expect.objectContaining({
                    body: JSON.stringify({
                        position: { x: 1024, y: -512 },
                        pinned: true,
                    }),
                }),
            ),
        );

        runFrames(30);

        const node = screen.getByTestId('entity:space:a');

        expect(node).toHaveAttribute('data-pinned', 'true');
        expect(node).toHaveAttribute('data-x', '1024');
        expect(node).toHaveAttribute('data-y', '-512');
    });

    it('moves a nested space without saving a layout for it', () => {
        renderSpace([note('a', 'Alfa')]);

        fireEvent.click(
            screen.getByRole('button', { name: 'soltar Continente' }),
        );

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('tells the styles the current zoom so targets keep their size on screen', () => {
        renderSpace([note('a', 'Alfa')]);

        const canvas = screen.getByRole('main', { name: 'Canvas do vault' });

        expect(canvas.style.getPropertyValue('--cvc-zoom')).toBe('1');

        fireEvent.click(screen.getByRole('button', { name: 'afastar' }));

        expect(canvas.style.getPropertyValue('--cvc-zoom')).toBe('0.5');
    });

    it('lets the canvas zoom far beyond what any space needs', () => {
        renderSpace([note('a', 'Alfa')]);

        const library = screen.getByTestId('canvas-library');

        expect(
            Number(library.getAttribute('data-min-zoom')),
        ).toBeLessThanOrEqual(0.01);
        expect(
            Number(library.getAttribute('data-max-zoom')),
        ).toBeGreaterThanOrEqual(100);
    });

    it('draws nothing behind the notes', () => {
        renderSpace([note('a', 'Alfa')]);

        expect(
            screen
                .getByTestId('canvas-library')
                .querySelectorAll('svg, pattern'),
        ).toHaveLength(0);
    });

    it('draws the vault itself as the space that holds the universes', () => {
        renderSpace([note('a', 'Alfa')], { breadcrumbs: [] });

        expect(screen.getByTestId('context:space')).toHaveAttribute(
            'data-type',
            'cosmic',
        );
        expect(screen.queryByTestId('entity:space:a')).not.toBeInTheDocument();
        expect(screen.queryByTestId('context:nested')).not.toBeInTheDocument();
    });

    function answerCreation() {
        fetchMock.mockImplementation((url: string) =>
            Promise.resolve({
                ok: true,
                json: async () =>
                    url === '/vault/documents'
                        ? {
                              document: {
                                  ...note('fresh', 'Recente'),
                                  content: '',
                              },
                          }
                        : { updated: true },
            }),
        );
    }

    it('creates a note where an empty point of the space is double-clicked', async () => {
        answerCreation();
        renderSpace([note('a', 'Alfa', { position: { x: 4096, y: 0 } })]);
        fireEvent.click(screen.getByRole('button', { name: 'afastar' }));

        fireEvent.doubleClick(screen.getByTestId('pane'), {
            clientX: 300,
            clientY: 200,
        });

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/vault/contexts/space/entities/fresh/layout',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        position: { x: 600, y: 400 },
                        pinned: false,
                    }),
                }),
            ),
        );
        expect(fetchMock).toHaveBeenCalledWith(
            '/vault/documents',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ context_id: 'space' }),
            }),
        );

        const node = screen.getByTestId('entity:space:fresh');

        expect(node).toHaveAttribute('data-x', '600');
        expect(node).toHaveAttribute('data-y', '400');
        expect(
            await screen.findByRole('textbox', { name: 'Conteúdo Markdown' }),
        ).toBeInTheDocument();
    });

    it('does not create a note when a circle is double-clicked', () => {
        answerCreation();
        renderSpace([note('a', 'Alfa')]);

        fireEvent.doubleClick(screen.getByTestId('entity:space:a'));

        expect(fetchMock).not.toHaveBeenCalledWith(
            '/vault/documents',
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('creates nothing at the vault root, which holds only universes', () => {
        answerCreation();
        renderSpace([], { breadcrumbs: [] });

        fireEvent.doubleClick(screen.getByTestId('pane'), {
            clientX: 300,
            clientY: 200,
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('has no button for creating a note', () => {
        renderSpace([note('a', 'Alfa')]);

        expect(
            screen.queryByRole('button', { name: 'Nova nota' }),
        ).not.toBeInTheDocument();
    });

    it('keeps the tools out of the way until they are asked for', () => {
        renderSpace([note('a', 'Alfa')]);

        expect(
            screen.queryByRole('complementary', {
                name: 'Ferramentas do vault',
            }),
        ).not.toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Abrir ferramentas' }),
        );

        const tools = screen.getByRole('complementary', {
            name: 'Ferramentas do vault',
        });

        expect(tools).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Fechar ferramentas' }),
        ).toHaveAttribute('aria-expanded', 'true');

        fireEvent.keyDown(
            screen.getByRole('button', { name: 'Fechar ferramentas' }),
            { key: 'Escape' },
        );

        expect(
            screen.queryByRole('complementary', {
                name: 'Ferramentas do vault',
            }),
        ).not.toBeInTheDocument();
    });

    it('shows the current path in the header and no explorer column', () => {
        renderSpace([note('a', 'Alfa')]);

        const path = screen.getByRole('navigation', { name: 'Caminho atual' });

        expect(path).toHaveTextContent('Vault');
        expect(path).toHaveTextContent('Planeta');
        expect(
            screen.queryByRole('complementary', {
                name: 'Explorador do vault',
            }),
        ).not.toBeInTheDocument();
    });
});
