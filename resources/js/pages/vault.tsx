import { Head } from '@inertiajs/react';
import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
} from '@xyflow/react';
import type {
    Edge,
    NodeMouseHandler,
    NodeTypes,
    ReactFlowInstance,
    Viewport,
} from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';

import '@xyflow/react/dist/style.css';
import '../../css/presets.css';
import '../../css/cvc.css';

import { KnowledgeNode } from '../canvas/knowledge-node';
import type { KnowledgeCanvasNode } from '../canvas/knowledge-node';
import {
    initialSemanticLevel,
    resolveSemanticLevel,
} from '../canvas/semantic-zoom';
import type { SemanticLevel } from '../canvas/semantic-zoom';
import {
    createDocument,
    openDocument,
    saveDocument,
} from '../documents/api';
import { DocumentEditor } from '../documents/document-editor';
import type {
    DocumentSummary,
    OpenedDocument,
    SaveState,
} from '../documents/types';
import { saveWorkspaceState } from '../workspace/api';

type ContextSummary = {
    id: string;
    name: string;
    documents: DocumentSummary[];
};

type UniverseSummary = {
    id: string;
    name: string;
    contexts: ContextSummary[];
};

type VaultPageProps = {
    vault: {
        id: string;
        name: string;
        universes: UniverseSummary[];
    };
    endpoints: {
        documents: string;
        workspace: string;
    };
    workspace: {
        viewport: Viewport;
        focusEntityId: string | null;
    };
};

const nodeTypes: NodeTypes = {
    knowledge: KnowledgeNode,
};

const semanticLevelLabels: Record<SemanticLevel, string> = {
    universe: 'Universos',
    context: 'Contextos',
    document: 'Documentos',
};

function buildNodes(
    universes: UniverseSummary[],
    semanticLevel: SemanticLevel,
    focusEntityId: string | null,
): KnowledgeCanvasNode[] {
    return universes.flatMap((universe, universeIndex) => {
        const universeY = universeIndex * 420;
        const universeNode: KnowledgeCanvasNode = {
            id: universe.id,
            type: 'knowledge',
            position: { x: 0, y: universeY },
            data: {
                kind: 'universe',
                label: universe.name,
                semanticLevel,
            },
        };

        return [
            universeNode,
            ...universe.contexts.flatMap((context, contextIndex) => {
                const contextY = universeY + contextIndex * 220;
                const contextNode: KnowledgeCanvasNode = {
                    id: context.id,
                    type: 'knowledge',
                    position: { x: 380, y: contextY },
                    hidden: semanticLevel === 'universe',
                    data: {
                        kind: 'context',
                        label: context.name,
                        semanticLevel,
                    },
                };
                const documentNodes: KnowledgeCanvasNode[] =
                    context.documents.map((document, documentIndex) => ({
                        id: document.id,
                        type: 'knowledge',
                        position: {
                            x: 760,
                            y: contextY + documentIndex * 160,
                        },
                        hidden: semanticLevel !== 'document',
                        selected: document.id === focusEntityId,
                        data: {
                            kind: 'document',
                            label: document.title ?? 'Sem título',
                            semanticLevel,
                        },
                    }));

                return [contextNode, ...documentNodes];
            }),
        ];
    });
}

function buildEdges(universes: UniverseSummary[]): Edge[] {
    return universes.flatMap((universe) =>
        universe.contexts.flatMap((context) => [
            {
                id: `${universe.id}:${context.id}`,
                source: universe.id,
                target: context.id,
            },
            ...context.documents.map((document) => ({
                id: `${context.id}:${document.id}`,
                source: context.id,
                target: document.id,
            })),
        ]),
    );
}

export default function VaultPage({
    vault,
    endpoints,
    workspace,
}: VaultPageProps) {
    const [universes, setUniverses] = useState(vault.universes);
    const [semanticLevel, setSemanticLevel] = useState<SemanticLevel>(() =>
        initialSemanticLevel(workspace.viewport.zoom),
    );
    const [activeDocument, setActiveDocument] =
        useState<OpenedDocument | null>(null);
    const [draft, setDraft] = useState('');
    const [saveState, setSaveState] = useState<SaveState>('saved');
    const [error, setError] = useState<string | null>(null);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [focusEntityId, setFocusEntityId] = useState(
        workspace.focusEntityId,
    );
    const [isCreating, setIsCreating] = useState(false);
    const [flow, setFlow] =
        useState<ReactFlowInstance<KnowledgeCanvasNode, Edge> | null>(null);
    const viewport = useRef<Viewport>({ ...workspace.viewport });
    const returnViewport = useRef<Viewport | null>(null);
    const nodes = useMemo(
        () => buildNodes(universes, semanticLevel, focusEntityId),
        [focusEntityId, semanticLevel, universes],
    );
    const edges = useMemo(() => buildEdges(universes), [universes]);
    const firstContextId = universes[0]?.contexts[0]?.id;

    const handleMove = useCallback(
        (_event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
            viewport.current = nextViewport;
            setSemanticLevel((previousLevel) =>
                resolveSemanticLevel(nextViewport.zoom, previousLevel),
            );
        },
        [],
    );

    const persistWorkspace = useCallback(
        async (nextViewport: Viewport, nextFocusEntityId: string | null) => {
            try {
                await saveWorkspaceState(
                    endpoints.workspace,
                    nextViewport,
                    nextFocusEntityId,
                );
                setWorkspaceError(null);
            } catch (exception) {
                setWorkspaceError(
                    exception instanceof Error
                        ? exception.message
                        : 'Não foi possível salvar o enquadramento.',
                );
            }
        },
        [endpoints.workspace],
    );

    const handleMoveEnd = useCallback(
        (_event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
            void persistWorkspace(nextViewport, focusEntityId);
        },
        [focusEntityId, persistWorkspace],
    );

    const showDocument = useCallback((document: OpenedDocument) => {
        returnViewport.current = { ...viewport.current };
        setActiveDocument(document);
        setDraft(document.content);
        setSaveState('saved');
        setError(null);
    }, []);

    const handleCreate = useCallback(async () => {
        if (!firstContextId || isCreating) {
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const document = await createDocument(
                endpoints.documents,
                firstContextId,
            );
            setUniverses((current) =>
                current.map((universe) => ({
                    ...universe,
                    contexts: universe.contexts.map((context) =>
                        context.id === firstContextId
                            ? {
                                  ...context,
                                  documents: [
                                      ...context.documents,
                                      document,
                                  ],
                              }
                            : context,
                    ),
                })),
            );
            setFocusEntityId(document.id);
            showDocument(document);
            void persistWorkspace(viewport.current, document.id);
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível criar a nota.',
            );
        } finally {
            setIsCreating(false);
        }
    }, [
        endpoints.documents,
        firstContextId,
        isCreating,
        persistWorkspace,
        showDocument,
    ]);

    const handleNodeDoubleClick = useCallback<NodeMouseHandler>(
        async (_event, node) => {
            if (node.data.kind !== 'document') {
                return;
            }

            setError(null);

            try {
                const document = await openDocument(
                    endpoints.documents,
                    node.id,
                );
                setFocusEntityId(document.id);
                showDocument(document);
                void persistWorkspace(viewport.current, document.id);
            } catch (exception) {
                setError(
                    exception instanceof Error
                        ? exception.message
                        : 'Não foi possível abrir o documento.',
                );
            }
        },
        [endpoints.documents, persistWorkspace, showDocument],
    );

    const handleDraftChange = useCallback((content: string) => {
        setDraft(content);
        setSaveState('pending');
        setError(null);
    }, []);

    const handleSave = useCallback(async () => {
        if (!activeDocument) {
            return;
        }

        setSaveState('saving');
        setError(null);

        try {
            const saved = await saveDocument(
                endpoints.documents,
                activeDocument,
                draft,
            );
            setActiveDocument(saved);
            setDraft(saved.content);
            setSaveState('saved');
        } catch (exception) {
            setSaveState('failed');
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível salvar o documento.',
            );
        }
    }, [activeDocument, draft, endpoints.documents]);

    const handleBack = useCallback(() => {
        setActiveDocument(null);
        setError(null);

        if (returnViewport.current) {
            void flow?.setViewport(returnViewport.current);
        }
    }, [flow]);

    return (
        <div className="cvc-theme cvc-shell">
            <Head title="CVC" />
            <header className="cvc-header">
                <div>
                    <span className="cvc-eyebrow">Crow Vault Canvas</span>
                    <h1>{vault.name}</h1>
                </div>
                <div className="cvc-header__actions">
                    <output className="cvc-zoom-state" aria-live="polite">
                        Nível: {semanticLevelLabels[semanticLevel]}
                    </output>
                    <button
                        type="button"
                        className="cvc-button cvc-button--primary"
                        disabled={!firstContextId || isCreating}
                        onClick={() => void handleCreate()}
                    >
                        {isCreating ? 'Criando…' : 'Nova nota'}
                    </button>
                </div>
            </header>

            {(error || workspaceError) && !activeDocument && (
                <p className="cvc-page-error" role="alert">
                    {error ?? workspaceError}
                </p>
            )}

            <main className="cvc-canvas" aria-label="Canvas do vault">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    defaultViewport={viewport.current}
                    minZoom={0.25}
                    maxZoom={2}
                    onInit={setFlow}
                    onMove={handleMove}
                    onMoveEnd={handleMoveEnd}
                    onNodeDoubleClick={handleNodeDoubleClick}
                    nodesDraggable={false}
                    nodesFocusable
                    selectionOnDrag
                >
                    <Background
                        color="var(--cvc-canvas-grid)"
                        variant={BackgroundVariant.Dots}
                        gap={24}
                        size={1.5}
                    />
                    <Controls position="bottom-right" showInteractive={false} />
                </ReactFlow>
            </main>

            {activeDocument && (
                <DocumentEditor
                    document={activeDocument}
                    draft={draft}
                    saveState={saveState}
                    error={error}
                    onChange={handleDraftChange}
                    onSave={() => void handleSave()}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}
