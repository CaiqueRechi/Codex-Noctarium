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
    OnNodeDrag,
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
    contextNodeId,
    entityNodeId,
    universeNodeId,
} from '../canvas/node-identifiers';
import {
    initialSemanticLevel,
    resolveSemanticLevel,
} from '../canvas/semantic-zoom';
import type { SemanticLevel } from '../canvas/semantic-zoom';
import { createDocument, openDocument, saveDocument } from '../documents/api';
import { DocumentEditor } from '../documents/document-editor';
import type { OpenedDocument, SaveState } from '../documents/types';
import { updateEntityProperties } from '../entities/api';
import { PropertiesPanel } from '../entities/properties-panel';
import type { EntityProperties } from '../entities/types';
import { VaultExplorer } from '../explorer/vault-explorer';
import type {
    ExplorerTarget,
    UniverseSummary,
} from '../explorer/vault-explorer';
import {
    attachEntityToContext,
    createRelation,
    deleteRelation,
    saveEntityLayout,
} from '../relations/api';
import { RelationsPanel } from '../relations/relations-panel';
import type { RelationSummary } from '../relations/types';
import { saveWorkspaceState } from '../workspace/api';

type VaultPageProps = {
    vault: {
        id: string;
        name: string;
        universes: UniverseSummary[];
        relations?: RelationSummary[];
    };
    endpoints: {
        documents: string;
        entities: string;
        contexts?: string;
        relations?: string;
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
            id: universeNodeId(universe.id),
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
                    id: contextNodeId(context.id),
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
                        id: entityNodeId(context.id, document.id),
                        type: 'knowledge',
                        position: {
                            x: document.position?.x ?? 760,
                            y:
                                document.position?.y ??
                                contextY + documentIndex * 160,
                        },
                        draggable: true,
                        hidden: semanticLevel !== 'document',
                        selected: document.id === focusEntityId,
                        data: {
                            kind: 'document',
                            label: document.title ?? 'Sem título',
                            semanticLevel,
                            entityId: document.id,
                            contextId: context.id,
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
                source: universeNodeId(universe.id),
                target: contextNodeId(context.id),
            },
            ...context.documents.map((document) => ({
                id: `${context.id}:${document.id}`,
                source: contextNodeId(context.id),
                target: entityNodeId(context.id, document.id),
            })),
        ]),
    );
}

function buildRelationEdges(
    universes: UniverseSummary[],
    relations: RelationSummary[],
): Edge[] {
    const contexts = universes.flatMap((universe) => universe.contexts);

    return relations.flatMap((relation) => {
        const sourceContext = relation.contextId
            ? contexts.find((context) => context.id === relation.contextId)
            : contexts.find((context) =>
                  context.documents.some(
                      (document) => document.id === relation.sourceEntityId,
                  ),
              );
        const targetContext = relation.contextId
            ? sourceContext
            : contexts.find((context) =>
                  context.documents.some(
                      (document) => document.id === relation.targetEntityId,
                  ),
              );

        if (!sourceContext || !targetContext) {
            return [];
        }

        return [
            {
                id: `relation:${relation.id}`,
                source: entityNodeId(sourceContext.id, relation.sourceEntityId),
                target: entityNodeId(targetContext.id, relation.targetEntityId),
                label: relation.relationType ?? undefined,
                animated: relation.isDirected,
            },
        ];
    });
}

export default function VaultPage({
    vault,
    endpoints,
    workspace,
}: VaultPageProps) {
    const [universes, setUniverses] = useState(vault.universes);
    const [relations, setRelations] = useState(vault.relations ?? []);
    const [semanticLevel, setSemanticLevel] = useState<SemanticLevel>(() =>
        initialSemanticLevel(workspace.viewport.zoom),
    );
    const [activeDocument, setActiveDocument] = useState<OpenedDocument | null>(
        null,
    );
    const [draft, setDraft] = useState('');
    const [saveState, setSaveState] = useState<SaveState>('saved');
    const [error, setError] = useState<string | null>(null);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [focusEntityId, setFocusEntityId] = useState(workspace.focusEntityId);
    const [isCreating, setIsCreating] = useState(false);
    const [flow, setFlow] = useState<ReactFlowInstance<
        KnowledgeCanvasNode,
        Edge
    > | null>(null);
    const viewport = useRef<Viewport>({ ...workspace.viewport });
    const returnViewport = useRef<Viewport | null>(null);
    const nodes = useMemo(
        () => buildNodes(universes, semanticLevel, focusEntityId),
        [focusEntityId, semanticLevel, universes],
    );
    const edges = useMemo(
        () => [
            ...buildEdges(universes),
            ...buildRelationEdges(universes, relations),
        ],
        [relations, universes],
    );
    const focusedDocument = useMemo(
        () =>
            universes
                .flatMap((universe) => universe.contexts)
                .flatMap((context) => context.documents)
                .find((document) => document.id === focusEntityId) ?? null,
        [focusEntityId, universes],
    );
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
                                  documents: [...context.documents, document],
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

    const handleNodeDoubleClick = useCallback<
        NodeMouseHandler<KnowledgeCanvasNode>
    >(
        async (_event, node) => {
            if (node.data.kind !== 'document' || !node.data.entityId) {
                return;
            }

            setError(null);

            try {
                const document = await openDocument(
                    endpoints.documents,
                    node.data.entityId,
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

    const handleNodeClick = useCallback<NodeMouseHandler<KnowledgeCanvasNode>>(
        (_event, node) => {
            if (node.data.kind !== 'document' || !node.data.entityId) {
                return;
            }

            setFocusEntityId(node.data.entityId);
            void persistWorkspace(viewport.current, node.data.entityId);
        },
        [persistWorkspace],
    );

    const handleNodeDragStop = useCallback<OnNodeDrag<KnowledgeCanvasNode>>(
        (_event, node) => {
            if (
                !node.data.entityId ||
                !node.data.contextId ||
                !endpoints.contexts
            ) {
                return;
            }

            setUniverses((current) =>
                current.map((universe) => ({
                    ...universe,
                    contexts: universe.contexts.map((context) => ({
                        ...context,
                        documents: context.documents.map((document) =>
                            context.id === node.data.contextId &&
                            document.id === node.data.entityId
                                ? {
                                      ...document,
                                      position: node.position,
                                      isPinned: true,
                                  }
                                : document,
                        ),
                    })),
                })),
            );
            void saveEntityLayout(
                endpoints.contexts,
                node.data.contextId,
                node.data.entityId,
                node.position,
            ).catch((exception: unknown) =>
                setWorkspaceError(
                    exception instanceof Error
                        ? exception.message
                        : 'Não foi possível salvar o layout.',
                ),
            );
        },
        [endpoints.contexts],
    );

    const handleLocate = useCallback(
        async (target: ExplorerTarget) => {
            const targetLevel: SemanticLevel =
                target.kind === 'document'
                    ? 'document'
                    : target.kind === 'context'
                      ? 'context'
                      : 'universe';

            setSemanticLevel(targetLevel);
            setFocusEntityId(target.entityId);

            if (!flow) {
                return;
            }

            await flow.fitView({
                nodes: [{ id: target.nodeId }],
                includeHiddenNodes: true,
                padding: 0.35,
                duration: 250,
            });
            const nextViewport = flow.getViewport();
            viewport.current = nextViewport;
            await persistWorkspace(nextViewport, target.entityId);
        },
        [flow, persistWorkspace],
    );

    const handleDraftChange = useCallback((content: string) => {
        setDraft(content);
        setSaveState('pending');
        setError(null);
    }, []);

    const handlePropertiesSave = useCallback(
        async (entityType: string | null, properties: EntityProperties) => {
            if (!focusedDocument) {
                return;
            }

            const updated = await updateEntityProperties(
                endpoints.entities,
                focusedDocument.id,
                entityType,
                properties,
            );
            setUniverses((current) =>
                current.map((universe) => ({
                    ...universe,
                    contexts: universe.contexts.map((context) => ({
                        ...context,
                        documents: context.documents.map((document) =>
                            document.id === updated.id ? updated : document,
                        ),
                    })),
                })),
            );
            setActiveDocument((current) =>
                current?.id === updated.id
                    ? { ...current, ...updated }
                    : current,
            );
        },
        [endpoints.entities, focusedDocument],
    );

    const requireRelationEndpoints = useCallback(() => {
        if (!endpoints.contexts || !endpoints.relations) {
            throw new Error('Os endpoints de relações não estão disponíveis.');
        }

        return {
            contexts: endpoints.contexts,
            relations: endpoints.relations,
        };
    }, [endpoints.contexts, endpoints.relations]);

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

            <div className="cvc-workspace">
                <VaultExplorer
                    universes={universes}
                    onLocate={(target) => void handleLocate(target)}
                />

                <main className="cvc-canvas" aria-label="Canvas do vault">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        defaultViewport={workspace.viewport}
                        minZoom={0.25}
                        maxZoom={2}
                        onInit={setFlow}
                        onMove={handleMove}
                        onMoveEnd={handleMoveEnd}
                        onNodeClick={handleNodeClick}
                        onNodeDragStop={handleNodeDragStop}
                        onNodeDoubleClick={handleNodeDoubleClick}
                        nodesDraggable
                        nodesFocusable
                        selectionOnDrag
                    >
                        <Background
                            color="var(--cvc-canvas-grid)"
                            variant={BackgroundVariant.Dots}
                            gap={24}
                            size={1.5}
                        />
                        <Controls
                            position="bottom-right"
                            showInteractive={false}
                        />
                    </ReactFlow>
                </main>

                <aside className="cvc-properties">
                    <PropertiesPanel
                        key={focusedDocument?.id ?? 'no-focused-entity'}
                        document={focusedDocument}
                        onSave={handlePropertiesSave}
                    />
                    {focusedDocument && (
                        <RelationsPanel
                            document={focusedDocument}
                            universes={universes}
                            relations={relations}
                            onAttach={async (contextId) => {
                                const relationEndpoints =
                                    requireRelationEndpoints();
                                await attachEntityToContext(
                                    relationEndpoints.contexts,
                                    contextId,
                                    focusedDocument.id,
                                );
                                setUniverses((current) =>
                                    current.map((universe) => ({
                                        ...universe,
                                        contexts: universe.contexts.map(
                                            (context) =>
                                                context.id === contextId
                                                    ? {
                                                          ...context,
                                                          documents: [
                                                              ...context.documents,
                                                              {
                                                                  ...focusedDocument,
                                                                  position:
                                                                      null,
                                                                  isPinned: false,
                                                              },
                                                          ],
                                                      }
                                                    : context,
                                        ),
                                    })),
                                );
                            }}
                            onCreate={async (
                                targetId,
                                contextId,
                                relationType,
                                isDirected,
                            ) => {
                                const relationEndpoints =
                                    requireRelationEndpoints();
                                const relation = await createRelation(
                                    relationEndpoints.relations,
                                    focusedDocument.id,
                                    targetId,
                                    contextId,
                                    relationType,
                                    isDirected,
                                );
                                setRelations((current) => [
                                    ...current,
                                    relation,
                                ]);
                            }}
                            onDelete={async (relationId) => {
                                const relationEndpoints =
                                    requireRelationEndpoints();
                                await deleteRelation(
                                    relationEndpoints.relations,
                                    relationId,
                                );
                                setRelations((current) =>
                                    current.filter(
                                        (relation) =>
                                            relation.id !== relationId,
                                    ),
                                );
                            }}
                        />
                    )}
                </aside>
            </div>

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
