import { Head, router } from '@inertiajs/react';
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
import cvcMark from '../../images/brand/cvc-mark-reduced.png';

import { AttachmentsPanel } from '../attachments/attachments-panel';
import type { AttachmentSummary } from '../attachments/types';
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
import { OperationalStatusPanel } from '../operations/operational-status-panel';
import type { OperationalTask } from '../operations/types';
import {
    createPerspective,
    savePerspectiveLayout,
    updatePerspective,
} from '../perspectives/api';
import { PerspectivesPanel } from '../perspectives/perspectives-panel';
import type {
    PerspectiveFilters,
    PerspectiveSummary,
} from '../perspectives/types';
import {
    attachEntityToContext,
    createRelation,
    deleteRelation,
    saveEntityLayout,
} from '../relations/api';
import { RelationsPanel } from '../relations/relations-panel';
import type { RelationSummary } from '../relations/types';
import { SearchPanel } from '../search/search-panel';
import { deleteEntity, restoreEntity } from '../trash/api';
import { TrashPanel } from '../trash/trash-panel';
import type { TrashItem } from '../trash/types';
import { createVersion, restoreVersion } from '../versions/api';
import { saveWorkspaceState } from '../workspace/api';

type VaultPageProps = {
    vault: {
        id: string;
        name: string;
        universes: UniverseSummary[];
        relations?: RelationSummary[];
        perspectives?: PerspectiveSummary[];
        trash?: TrashItem[];
        operations?: OperationalTask[];
    };
    endpoints: {
        documents: string;
        entities: string;
        contexts?: string;
        relations?: string;
        perspectives?: string;
        versions?: string;
        search?: string;
        operations?: string;
        trash?: string;
        attachments?: string;
        workspace: string;
    };
    workspace: {
        viewport: Viewport;
        focusEntityId: string | null;
        perspectiveId?: string | null;
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

function applyPerspective(
    universes: UniverseSummary[],
    perspective: PerspectiveSummary | null,
): UniverseSummary[] {
    if (!perspective) {
        return universes;
    }

    const contextIds = new Set(perspective.filters.contextIds);
    const entityTypes = new Set(perspective.filters.entityTypes);
    const layouts = new Map(
        perspective.layouts.map((layout) => [
            `${layout.contextId}:${layout.entityId}`,
            layout,
        ]),
    );

    return universes
        .map((universe) => ({
            ...universe,
            contexts: universe.contexts
                .filter(
                    (context) =>
                        contextIds.size === 0 || contextIds.has(context.id),
                )
                .map((context) => ({
                    ...context,
                    documents: context.documents
                        .filter(
                            (document) =>
                                entityTypes.size === 0 ||
                                (document.entityType !== null &&
                                    entityTypes.has(document.entityType)),
                        )
                        .map((document) => {
                            const layout = layouts.get(
                                `${context.id}:${document.id}`,
                            );

                            return layout
                                ? {
                                      ...document,
                                      position: layout.position,
                                      isPinned: layout.isPinned,
                                  }
                                : document;
                        }),
                })),
        }))
        .filter((universe) => universe.contexts.length > 0);
}

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
    const [trash, setTrash] = useState(vault.trash ?? []);
    const [trashNotice, setTrashNotice] = useState<string | null>(null);
    const [perspectives, setPerspectives] = useState(vault.perspectives ?? []);
    const [activePerspectiveId, setActivePerspectiveId] = useState<
        string | null
    >(workspace.perspectiveId ?? vault.perspectives?.[0]?.id ?? null);
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
    const activePerspective = useMemo(
        () =>
            perspectives.find(
                (perspective) => perspective.id === activePerspectiveId,
            ) ?? null,
        [activePerspectiveId, perspectives],
    );
    const visibleUniverses = useMemo(
        () => applyPerspective(universes, activePerspective),
        [activePerspective, universes],
    );
    const nodes = useMemo(
        () => buildNodes(visibleUniverses, semanticLevel, focusEntityId),
        [focusEntityId, semanticLevel, visibleUniverses],
    );
    const edges = useMemo(
        () => [
            ...buildEdges(visibleUniverses),
            ...buildRelationEdges(visibleUniverses, relations),
        ],
        [relations, visibleUniverses],
    );
    const focusedDocument = useMemo(
        () =>
            visibleUniverses
                .flatMap((universe) => universe.contexts)
                .flatMap((context) => context.documents)
                .find((document) => document.id === focusEntityId) ?? null,
        [focusEntityId, visibleUniverses],
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
        async (
            nextViewport: Viewport,
            nextFocusEntityId: string | null,
            nextPerspectiveId: string | null = activePerspectiveId,
        ) => {
            try {
                await saveWorkspaceState(
                    endpoints.workspace,
                    nextViewport,
                    nextFocusEntityId,
                    nextPerspectiveId,
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
        [activePerspectiveId, endpoints.workspace],
    );

    const handleMoveEnd = useCallback(
        (event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
            if (event === null) {
                return;
            }

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
            if (!node.data.entityId || !node.data.contextId) {
                return;
            }

            if (activePerspectiveId && endpoints.perspectives) {
                setPerspectives((current) =>
                    current.map((perspective) => {
                        if (perspective.id !== activePerspectiveId) {
                            return perspective;
                        }

                        const nextLayout = {
                            contextId: node.data.contextId as string,
                            entityId: node.data.entityId as string,
                            position: node.position,
                            isPinned: true,
                        };
                        const layoutExists = perspective.layouts.some(
                            (layout) =>
                                layout.contextId === node.data.contextId &&
                                layout.entityId === node.data.entityId,
                        );

                        return {
                            ...perspective,
                            layouts: layoutExists
                                ? perspective.layouts.map((layout) =>
                                      layout.contextId ===
                                          node.data.contextId &&
                                      layout.entityId === node.data.entityId
                                          ? nextLayout
                                          : layout,
                                  )
                                : [...perspective.layouts, nextLayout],
                        };
                    }),
                );
                void savePerspectiveLayout(
                    endpoints.perspectives,
                    activePerspectiveId,
                    node.data.contextId,
                    node.data.entityId,
                    node.position,
                ).catch((exception: unknown) =>
                    setWorkspaceError(
                        exception instanceof Error
                            ? exception.message
                            : 'Não foi possível salvar o layout da perspectiva.',
                    ),
                );

                return;
            }

            if (!endpoints.contexts) {
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
        [activePerspectiveId, endpoints.contexts, endpoints.perspectives],
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
        async (
            entityType: string | null,
            properties: EntityProperties,
            tags: string[],
        ) => {
            if (!focusedDocument) {
                return;
            }

            const updated = await updateEntityProperties(
                endpoints.entities,
                focusedDocument.id,
                entityType,
                properties,
                tags,
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

    const perspectiveEndpoint = useCallback(() => {
        if (!endpoints.perspectives) {
            throw new Error('O endpoint de perspectivas não está disponível.');
        }

        return endpoints.perspectives;
    }, [endpoints.perspectives]);

    const handlePerspectiveCreate = useCallback(
        async (
            name: string,
            sourcePerspectiveId: string | null,
            filters: PerspectiveFilters,
        ) => {
            const created = await createPerspective(
                perspectiveEndpoint(),
                name,
                sourcePerspectiveId,
                filters,
            );
            setPerspectives((current) => [...current, created]);
            setActivePerspectiveId(created.id);
            await persistWorkspace(viewport.current, focusEntityId, created.id);
        },
        [focusEntityId, persistWorkspace, perspectiveEndpoint],
    );

    const handlePerspectiveUpdate = useCallback(
        async (
            perspectiveId: string,
            name: string,
            filters: PerspectiveFilters,
        ) => {
            const updated = await updatePerspective(
                perspectiveEndpoint(),
                perspectiveId,
                name,
                filters,
            );
            setPerspectives((current) =>
                current.map((perspective) =>
                    perspective.id === updated.id ? updated : perspective,
                ),
            );
        },
        [perspectiveEndpoint],
    );

    const handlePerspectiveSelect = useCallback(
        (perspectiveId: string) => {
            setActivePerspectiveId(perspectiveId);
            void persistWorkspace(
                viewport.current,
                focusEntityId,
                perspectiveId,
            );
        },
        [focusEntityId, persistWorkspace],
    );

    const handleSearchSelect = useCallback(
        (entityId: string) => {
            const context = universes
                .flatMap((universe) => universe.contexts)
                .find((candidate) =>
                    candidate.documents.some(
                        (document) => document.id === entityId,
                    ),
                );

            if (!context) {
                setError('O resultado não está disponível no canvas atual.');

                return;
            }

            const matchingPerspective = perspectives.find((perspective) =>
                applyPerspective(universes, perspective).some((universe) =>
                    universe.contexts.some((candidate) =>
                        candidate.documents.some(
                            (document) => document.id === entityId,
                        ),
                    ),
                ),
            );

            if (
                matchingPerspective &&
                matchingPerspective.id !== activePerspectiveId
            ) {
                handlePerspectiveSelect(matchingPerspective.id);
            } else if (!matchingPerspective && activePerspectiveId !== null) {
                setActivePerspectiveId(null);
                void persistWorkspace(viewport.current, entityId, null);
            }

            window.requestAnimationFrame(() => {
                void handleLocate({
                    nodeId: entityNodeId(context.id, entityId),
                    entityId,
                    kind: 'document',
                });
            });
        },
        [
            activePerspectiveId,
            handleLocate,
            handlePerspectiveSelect,
            perspectives,
            persistWorkspace,
            universes,
        ],
    );

    const handleVersionCreate = useCallback(
        async (name: string) => {
            if (!activePerspectiveId) {
                throw new Error(
                    'Selecione uma perspectiva antes de versionar.',
                );
            }

            const version = await createVersion(
                perspectiveEndpoint(),
                activePerspectiveId,
                name,
            );
            setPerspectives((current) =>
                current.map((perspective) =>
                    perspective.id === activePerspectiveId
                        ? {
                              ...perspective,
                              versions: [
                                  version,
                                  ...(perspective.versions ?? []),
                              ],
                          }
                        : perspective,
                ),
            );
        },
        [activePerspectiveId, perspectiveEndpoint],
    );

    const handleVersionRestore = useCallback(
        async (versionId: string) => {
            if (!endpoints.versions) {
                throw new Error('O endpoint de versões não está disponível.');
            }

            await restoreVersion(endpoints.versions, versionId);
            router.reload({ only: ['vault', 'workspace'] });
        },
        [endpoints.versions],
    );

    const handleEntityDelete = useCallback(
        async (entityId: string) => {
            const deletion = await deleteEntity(endpoints.entities, entityId);

            setUniverses((current) =>
                current.map((universe) => ({
                    ...universe,
                    contexts: universe.contexts.map((context) => ({
                        ...context,
                        documents: context.documents.filter(
                            (document) => document.id !== entityId,
                        ),
                    })),
                })),
            );
            setRelations((current) =>
                current.filter(
                    (relation) =>
                        !deletion.deletedRelationIds.includes(relation.id),
                ),
            );
            setTrash((current) => [
                deletion.trashItem,
                ...current.filter((item) => item.id !== entityId),
            ]);
            setTrashNotice(null);

            if (focusEntityId === entityId) {
                setFocusEntityId(null);
                setActiveDocument(null);
                await persistWorkspace(
                    viewport.current,
                    null,
                    activePerspectiveId,
                );
            }
        },
        [activePerspectiveId, endpoints.entities, focusEntityId, persistWorkspace],
    );

    const handleEntityRestore = useCallback(
        async (entityId: string) => {
            if (!endpoints.trash) {
                throw new Error('O endpoint da lixeira não está disponível.');
            }

            const restoration = await restoreEntity(endpoints.trash, entityId);
            const memberships = new Map(
                restoration.memberships.map((membership) => [
                    membership.contextId,
                    membership,
                ]),
            );

            setUniverses((current) =>
                current.map((universe) => ({
                    ...universe,
                    contexts: universe.contexts.map((context) => {
                        const membership = memberships.get(context.id);

                        if (
                            !membership ||
                            context.documents.some(
                                (document) => document.id === entityId,
                            )
                        ) {
                            return context;
                        }

                        return {
                            ...context,
                            documents: [
                                ...context.documents,
                                {
                                    ...restoration.entity,
                                    position: membership.position,
                                    isPinned: membership.isPinned,
                                },
                            ],
                        };
                    }),
                })),
            );
            setRelations((current) => [
                ...current,
                ...restoration.restoredRelations.filter(
                    (relation) =>
                        !current.some((existing) => existing.id === relation.id),
                ),
            ]);
            setTrash((current) =>
                current.filter((item) => item.id !== entityId),
            );
            setTrashNotice(
                restoration.brokenRelations.length === 0
                    ? 'Entidade e relações válidas restauradas.'
                    : `${restoration.brokenRelations.length} relação(ões) permanecem inativas por destinos ausentes.`,
            );
        },
        [endpoints.trash],
    );

    const handleAttachmentUploaded = useCallback(
        (attachment: AttachmentSummary) => {
            if (!focusedDocument) {
                return;
            }

            const addAttachment = <T extends { attachments?: AttachmentSummary[] }>(
                document: T,
            ): T => ({
                ...document,
                attachments: [...(document.attachments ?? []), attachment],
            });

            setUniverses((current) =>
                current.map((universe) => ({
                    ...universe,
                    contexts: universe.contexts.map((context) => ({
                        ...context,
                        documents: context.documents.map((document) =>
                            document.id === focusedDocument.id
                                ? addAttachment(document)
                                : document,
                        ),
                    })),
                })),
            );
            setActiveDocument((current) =>
                current?.id === focusedDocument.id
                    ? addAttachment(current)
                    : current,
            );
        },
        [focusedDocument],
    );

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
            <Head title="CVC">
                <link rel="icon" type="image/png" href={cvcMark} />
            </Head>
            <header className="cvc-header">
                <div className="cvc-brand">
                    <img
                        className="cvc-brand-mark"
                        src={cvcMark}
                        alt=""
                        aria-hidden="true"
                    />
                    <div>
                        <span className="cvc-eyebrow">Crow Vault Canvas</span>
                        <h1>{vault.name}</h1>
                    </div>
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
                    universes={visibleUniverses}
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
                    {endpoints.operations && (
                        <OperationalStatusPanel
                            endpoint={endpoints.operations}
                            initialTasks={vault.operations ?? []}
                            saveState={activeDocument ? saveState : null}
                        />
                    )}
                    {endpoints.search && (
                        <SearchPanel
                            endpoint={endpoints.search}
                            universes={universes}
                            onSelect={handleSearchSelect}
                        />
                    )}
                    {endpoints.trash && (
                        <TrashPanel
                            focusedDocument={focusedDocument}
                            items={trash}
                            notice={trashNotice}
                            onDelete={handleEntityDelete}
                            onRestore={handleEntityRestore}
                        />
                    )}
                    <PerspectivesPanel
                        perspectives={perspectives}
                        activePerspectiveId={activePerspectiveId}
                        universes={universes}
                        onSelect={handlePerspectiveSelect}
                        onCreate={handlePerspectiveCreate}
                        onUpdate={handlePerspectiveUpdate}
                        onCreateVersion={handleVersionCreate}
                        onRestoreVersion={handleVersionRestore}
                    />
                    <PropertiesPanel
                        key={focusedDocument?.id ?? 'no-focused-entity'}
                        document={focusedDocument}
                        onSave={handlePropertiesSave}
                    />
                    {focusedDocument && endpoints.attachments && (
                        <AttachmentsPanel
                            document={focusedDocument}
                            entitiesEndpoint={endpoints.entities}
                            attachmentsEndpoint={endpoints.attachments}
                            onUploaded={handleAttachmentUploaded}
                        />
                    )}
                    {focusedDocument && (
                        <RelationsPanel
                            document={focusedDocument}
                            universes={visibleUniverses}
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
