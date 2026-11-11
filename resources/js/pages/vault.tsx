import { Head, router } from '@inertiajs/react';
import { Controls, ReactFlow } from '@xyflow/react';
import type {
    Edge,
    NodeMouseHandler,
    NodeTypes,
    OnNodeDrag,
    ReactFlowInstance,
    Viewport,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';

import '@xyflow/react/dist/style.css';
import '../../css/presets.css';
import '../../css/cvc.css';
import cvcMark from '../../images/brand/cvc-mark-reduced.png';

import { AttachmentsPanel } from '../attachments/attachments-panel';
import type { AttachmentSummary } from '../attachments/types';
import { CosmicNoteNode } from '../canvas/cosmic-note-node';
import type {
    CosmicNoteCanvasNode,
    CosmicNoteData,
} from '../canvas/cosmic-note-node';
import {
    canvasUnitsPerLogicalUnit,
    frameCircles,
    radiusForArea,
    screenToCanvasPoint,
    toCanvasPoint,
    toLogicalPoint,
} from '../canvas/math/geometry';
import type { CanvasPoint } from '../canvas/math/geometry';
import { contextNodeId, entityNodeId } from '../canvas/node-identifiers';
import { buildCosmicScene } from '../canvas/physics/cosmic-scene';
import type { SimulationBody } from '../canvas/physics/simulation-body';
import { describeSpaceScene } from '../canvas/physics/space-scene';
import { useCosmicSimulation } from '../canvas/physics/use-cosmic-simulation';
import { createContext, openContextSlice } from '../contexts/api';
import { createDocument, openDocument } from '../documents/api';
import { DocumentEditor } from '../documents/document-editor';
import type { DocumentSummary, OpenedDocument } from '../documents/types';
import { useDocumentAutosave } from '../documents/use-document-autosave';
import { updateEntityProperties } from '../entities/api';
import { PropertiesPanel } from '../entities/properties-panel';
import type { EntityProperties } from '../entities/types';
import {
    flattenContexts,
    mapDocuments,
    updateContext,
    VaultExplorer,
    VaultPath,
} from '../explorer/vault-explorer';
import type {
    ContextBreadcrumb,
    ContextSummary,
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

type ContextPayload = {
    id: string;
    name: string;
    parentId?: string | null;
    kind?: 'universe' | 'context';
    ownContent?: number | null;
    descendantContent?: number | null;
    hasChildren?: boolean;
    documents?: DocumentSummary[];
    contexts?: ContextPayload[];
};

export type VaultPageProps = {
    navigation?: { home: string };
    vault: {
        id: string;
        name: string;
        universes: ContextPayload[];
        breadcrumbs?: ContextBreadcrumb[];
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
        focusContextId?: string | null;
        perspectiveId?: string | null;
    };
};

const nodeTypes: NodeTypes = {
    cosmic: CosmicNoteNode,
};

const toolsPanelId = 'cvc-tools';
// The canvas library needs finite bounds. These are far beyond any space
// the budget can produce, so the user never meets them as a limit.
const zoomLimits = { minZoom: 0.01, maxZoom: 100 };
// Framing a space is automatic, so it stays within a readable range.
const framingLimits = { minZoom: zoomLimits.minZoom, maxZoom: 2 };

function normalizeContexts(
    contexts: ContextPayload[],
    defaultKind: 'universe' | 'context' = 'universe',
): UniverseSummary[] {
    return contexts.map((context) => {
        const children = normalizeContexts(context.contexts ?? [], 'context');

        return {
            id: context.id,
            parentId: context.parentId ?? null,
            kind: context.kind ?? defaultKind,
            name: context.name,
            ownContent: context.ownContent,
            descendantContent: context.descendantContent,
            hasChildren: context.hasChildren ?? children.length > 0,
            documents: context.documents ?? [],
            contexts: children,
        };
    });
}

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

    const applyToContext = (
        context: UniverseSummary,
    ): UniverseSummary | null => {
        const contexts = context.contexts
            .map(applyToContext)
            .filter((child): child is UniverseSummary => child !== null);
        const isVisible =
            contextIds.size === 0 ||
            contextIds.has(context.id) ||
            contexts.length > 0;

        if (!isVisible) {
            return null;
        }

        return {
            ...context,
            contexts,
            documents: context.documents
                .filter(
                    (document) =>
                        entityTypes.size === 0 ||
                        (document.entityType !== null &&
                            entityTypes.has(document.entityType)),
                )
                .map((document) => {
                    const layout = layouts.get(`${context.id}:${document.id}`);

                    return layout
                        ? {
                              ...document,
                              position: layout.position,
                              isPinned: layout.isPinned,
                          }
                        : document;
                }),
        };
    };

    return universes
        .map(applyToContext)
        .filter((context): context is UniverseSummary => context !== null);
}

function buildSpaceNodes(
    space: ContextSummary,
    bodies: readonly SimulationBody[],
    unmeasuredNodeIds: ReadonlySet<string>,
    focusEntityId: string | null,
): CosmicNoteCanvasNode[] {
    type Description = Pick<
        CosmicNoteData,
        'kind' | 'label' | 'entityId' | 'contextId'
    >;
    const descriptions = new Map<string, Description>([
        ...space.documents.map((document): [string, Description] => [
            entityNodeId(space.id, document.id),
            {
                kind: 'document',
                label: document.title ?? 'Sem título',
                entityId: document.id,
                contextId: space.id,
            },
        ]),
        ...space.contexts.map((context): [string, Description] => [
            contextNodeId(context.id),
            { kind: 'context', label: context.name, contextId: context.id },
        ]),
    ]);

    return bodies.flatMap((body) => {
        const description = descriptions.get(body.id);

        if (!description) {
            return [];
        }

        const diameter = 2 * body.radius * canvasUnitsPerLogicalUnit;

        return [
            {
                id: body.id,
                type: 'cosmic',
                // The position is the centre of the circle. The size is given
                // here because the canvas library centres a node with the
                // size it knows, and a node rebuilt on every frame loses the
                // size the library measured: after a drag every circle
                // jumped by half its diameter.
                origin: [0.5, 0.5],
                width: diameter,
                height: diameter,
                position: toCanvasPoint(body.position),
                draggable: true,
                selected:
                    description.entityId !== undefined &&
                    description.entityId === focusEntityId,
                data: {
                    ...description,
                    diameter,
                    isPinned: body.isPinned,
                    isUnmeasured: unmeasuredNodeIds.has(body.id),
                },
            },
        ];
    });
}

function buildRelationEdges(
    universes: UniverseSummary[],
    relations: RelationSummary[],
): Edge[] {
    const contexts = flattenContexts(universes);

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
    navigation,
    vault,
    endpoints,
    workspace,
}: VaultPageProps) {
    const [universes, setUniverses] = useState(() =>
        normalizeContexts(vault.universes),
    );
    const [breadcrumbs, setBreadcrumbs] = useState(vault.breadcrumbs ?? []);
    const [relations, setRelations] = useState(vault.relations ?? []);
    const [trash, setTrash] = useState(vault.trash ?? []);
    const [trashNotice, setTrashNotice] = useState<string | null>(null);
    const [perspectives, setPerspectives] = useState(vault.perspectives ?? []);
    const [activePerspectiveId, setActivePerspectiveId] = useState<
        string | null
    >(workspace.perspectiveId ?? vault.perspectives?.[0]?.id ?? null);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const {
        session,
        document: activeDocument,
        draft,
        saveState,
        error: saveError,
    } = useDocumentAutosave(endpoints.documents);
    const setActiveDocument = useCallback(
        (
            update:
                | OpenedDocument
                | null
                | ((current: OpenedDocument | null) => OpenedDocument | null),
        ) => {
            if (typeof update === 'function') {
                session.updateDocument(update);
            } else if (update === null) {
                session.close();
            } else {
                session.open(update);
            }
        },
        [session],
    );
    const [error, setError] = useState<string | null>(null);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [focusEntityId, setFocusEntityId] = useState(workspace.focusEntityId);
    const [isCreating, setIsCreating] = useState(false);
    const [flow, setFlow] = useState<ReactFlowInstance<
        CosmicNoteCanvasNode,
        Edge
    > | null>(null);
    const canvas = useRef<HTMLElement | null>(null);
    const framesNextScene = useRef(false);
    const savedViewport = useRef<Viewport>({ ...workspace.viewport });
    const viewport = useRef<Viewport>({ ...workspace.viewport });
    const returnViewport = useRef<Viewport | null>(null);
    const navigationPending = useRef(false);
    const activeContextId = breadcrumbs.at(-1)?.id ?? null;
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
    // The vault itself is the outermost space: it holds the universes and
    // no note of its own.
    const activeSpace = useMemo<ContextSummary>(
        () =>
            flattenContexts(visibleUniverses).find(
                (context) => context.id === activeContextId,
            ) ?? {
                id: vault.id,
                parentId: null,
                kind: 'universe',
                name: vault.name,
                hasChildren: visibleUniverses.length > 0,
                documents: [],
                contexts: visibleUniverses,
            },
        [activeContextId, vault.id, vault.name, visibleUniverses],
    );
    const scene = useMemo(() => {
        const { notes, links } = describeSpaceScene(activeSpace, relations);

        return buildCosmicScene(notes, links);
    }, [activeSpace, relations]);
    const simulation = useCosmicSimulation(scene);
    const nodes = useMemo(
        () =>
            buildSpaceNodes(
                activeSpace,
                simulation.bodies,
                new Set(scene.unmeasuredNoteIds),
                focusEntityId,
            ),
        [activeSpace, focusEntityId, scene, simulation.bodies],
    );
    const edges = useMemo(
        () =>
            buildRelationEdges(
                [{ ...activeSpace, contexts: [] }],
                relations,
            ).map((edge) => ({ ...edge, type: 'straight' })),
        [activeSpace, relations],
    );
    const focusedDocument = useMemo(
        () =>
            flattenContexts(visibleUniverses)
                .flatMap((context) => context.documents)
                .find((document) => document.id === focusEntityId) ?? null,
        [focusEntityId, visibleUniverses],
    );
    const documentContextId = activeContextId;
    const hasPendingDraft = session.hasPendingChanges();

    useEffect(() => {
        if (!isToolsOpen) {
            return;
        }

        // The button that opens the panel keeps the focus, so the key has to
        // be heard on the document, not on the panel.
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsToolsOpen(false);
            }
        };

        document.addEventListener('keydown', closeOnEscape);

        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [isToolsOpen]);

    useEffect(() => {
        if (!hasPendingDraft && saveState !== 'saving') {
            return;
        }

        const guardUnload = (event: BeforeUnloadEvent) => {
            if (session.hasPendingChanges()) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        const guardNavigation = (event: Event) => {
            if (!session.hasPendingChanges()) {
                return;
            }

            event.preventDefault();

            if (navigationPending.current) {
                return;
            }

            type VisitOptions = NonNullable<Parameters<typeof router.visit>[1]>;
            const visit = (
                event as CustomEvent<{ visit?: VisitOptions & { url: URL } }>
            ).detail?.visit;

            if (!visit) {
                return;
            }

            navigationPending.current = true;
            void session
                .flush()
                .then((saved) => {
                    if (saved && !session.hasPendingChanges()) {
                        router.visit(visit.url, visit);
                    }
                })
                .finally(() => {
                    navigationPending.current = false;
                });
        };

        window.addEventListener('beforeunload', guardUnload);
        document.addEventListener('inertia:before', guardNavigation);

        return () => {
            window.removeEventListener('beforeunload', guardUnload);
            document.removeEventListener('inertia:before', guardNavigation);
        };
    }, [hasPendingDraft, saveState, session]);

    const handleMove = useCallback(
        (_event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
            viewport.current = nextViewport;
            canvas.current?.style.setProperty(
                '--cvc-zoom',
                String(nextViewport.zoom),
            );
        },
        [],
    );

    const persistWorkspace = useCallback(
        async (
            nextViewport: Viewport,
            nextFocusEntityId: string | null,
            nextPerspectiveId: string | null = activePerspectiveId,
            nextFocusContextId: string | null = activeContextId,
        ) => {
            try {
                await saveWorkspaceState(
                    endpoints.workspace,
                    nextViewport,
                    nextFocusEntityId,
                    nextPerspectiveId,
                    nextFocusContextId,
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
        [activeContextId, activePerspectiveId, endpoints.workspace],
    );

    const handleMoveEnd = useCallback(
        (event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
            if (event === null) {
                return;
            }

            // A click on the canvas ends a "move" that moved nothing. Saving
            // those queued a request per click behind the real ones.
            const saved = savedViewport.current;

            if (
                saved.x === nextViewport.x &&
                saved.y === nextViewport.y &&
                saved.zoom === nextViewport.zoom
            ) {
                return;
            }

            savedViewport.current = { ...nextViewport };
            void persistWorkspace(nextViewport, focusEntityId);
        },
        [focusEntityId, persistWorkspace],
    );

    const showDocument = useCallback(
        (document: OpenedDocument) => {
            returnViewport.current = { ...viewport.current };
            session.open(document);
            setError(null);
        },
        [session],
    );

    const handleOpenContext = useCallback(
        async (contextId: string | null) => {
            if (!(await session.flush())) {
                return;
            }

            if (!endpoints.contexts) {
                throw new Error('O endpoint de contextos não está disponível.');
            }

            const slice = await openContextSlice(endpoints.contexts, contextId);
            framesNextScene.current = true;
            setUniverses(slice.contexts);
            setBreadcrumbs(slice.breadcrumbs);
            setFocusEntityId(null);
            setActiveDocument(null);
            setError(null);
            await persistWorkspace(
                viewport.current,
                null,
                activePerspectiveId,
                contextId,
            );
        },
        [
            activePerspectiveId,
            endpoints.contexts,
            persistWorkspace,
            session,
            setActiveDocument,
        ],
    );

    const handleCreateContext = useCallback(
        async (name: string) => {
            if (!endpoints.contexts) {
                throw new Error('O endpoint de contextos não está disponível.');
            }

            await createContext(endpoints.contexts, name, activeContextId);
            const slice = await openContextSlice(
                endpoints.contexts,
                activeContextId,
            );
            setUniverses(slice.contexts);
            setBreadcrumbs(slice.breadcrumbs);
        },
        [activeContextId, endpoints.contexts],
    );

    const handleCreate = useCallback(
        async (position: CanvasPoint) => {
            if (!documentContextId || isCreating) {
                return;
            }

            setIsCreating(true);
            setError(null);

            try {
                if (!(await session.flush())) {
                    return;
                }

                const document = await createDocument(
                    endpoints.documents,
                    documentContextId,
                );
                setUniverses((current) =>
                    updateContext(current, documentContextId, (context) => ({
                        ...context,
                        documents: [
                            ...context.documents,
                            { ...document, position, isPinned: false },
                        ],
                    })),
                );

                if (endpoints.contexts) {
                    void saveEntityLayout(
                        endpoints.contexts,
                        documentContextId,
                        document.id,
                        position,
                        false,
                    ).catch((exception: unknown) =>
                        setWorkspaceError(
                            exception instanceof Error
                                ? exception.message
                                : 'Não foi possível salvar o layout.',
                        ),
                    );
                }

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
        },
        [
            endpoints.contexts,
            endpoints.documents,
            documentContextId,
            isCreating,
            persistWorkspace,
            session,
            showDocument,
        ],
    );

    // RN-02: a double click on an empty point of the space creates a note
    // there. A double click on a circle belongs to that circle.
    const handleCanvasDoubleClick = useCallback(
        (event: ReactMouseEvent<HTMLElement>) => {
            if (
                !(event.target instanceof Element) ||
                !event.target.classList.contains('react-flow__pane')
            ) {
                return;
            }

            const bounds = event.currentTarget.getBoundingClientRect();
            void handleCreate(
                screenToCanvasPoint(viewport.current, {
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                }),
            );
        },
        [handleCreate],
    );

    const handleNodeDoubleClick = useCallback<
        NodeMouseHandler<CosmicNoteCanvasNode>
    >(
        async (_event, node) => {
            if (node.data.kind !== 'document') {
                if (!node.data.contextId) {
                    return;
                }

                try {
                    await handleOpenContext(node.data.contextId);
                } catch (exception) {
                    setError(
                        exception instanceof Error
                            ? exception.message
                            : 'Não foi possível abrir o assunto.',
                    );
                }

                return;
            }

            if (!node.data.entityId) {
                return;
            }

            if (!(await session.flush())) {
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
        [
            endpoints.documents,
            handleOpenContext,
            persistWorkspace,
            session,
            showDocument,
        ],
    );

    const handleNodeClick = useCallback<NodeMouseHandler<CosmicNoteCanvasNode>>(
        (_event, node) => {
            if (node.data.kind !== 'document' || !node.data.entityId) {
                return;
            }

            setFocusEntityId(node.data.entityId);
            void persistWorkspace(viewport.current, node.data.entityId);
        },
        [persistWorkspace],
    );

    // A space that was just entered is framed whole. The stored viewport
    // is kept on the first load, so the camera returns where it was left.
    useEffect(() => {
        const element = canvas.current;

        if (!framesNextScene.current || !flow || !element) {
            return;
        }

        framesNextScene.current = false;
        const framed = frameCircles(
            scene.bodies.map((body) => ({
                center: toCanvasPoint(body.position),
                radius: radiusForArea(body.area) * canvasUnitsPerLogicalUnit,
            })),
            { width: element.clientWidth, height: element.clientHeight },
            { ...framingLimits, margin: 0.1 },
        );

        if (!framed) {
            return;
        }

        viewport.current = framed;
        savedViewport.current = framed;
        element.style.setProperty('--cvc-zoom', String(framed.zoom));
        void flow.setViewport(framed, { duration: 250 });
        void persistWorkspace(framed, null);
    }, [flow, persistWorkspace, scene]);

    const { holdBody, dropBody } = simulation;
    const handleNodeDrag = useCallback<OnNodeDrag<CosmicNoteCanvasNode>>(
        (_event, node) => {
            holdBody(node.id, toLogicalPoint(node.position));
        },
        [holdBody],
    );

    const handleNodeDragStop = useCallback<OnNodeDrag<CosmicNoteCanvasNode>>(
        (event, node) => {
            // RN-07: a note dropped freely settles with the others; holding
            // Ctrl while dropping pins it.
            const isPinned = 'ctrlKey' in event && event.ctrlKey;

            dropBody(node.id, isPinned);

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
                            isPinned,
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
                    isPinned,
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
                updateContext(
                    current,
                    node.data.contextId as string,
                    (context) => ({
                        ...context,
                        documents: context.documents.map((document) =>
                            document.id === node.data.entityId
                                ? {
                                      ...document,
                                      position: node.position,
                                      isPinned,
                                  }
                                : document,
                        ),
                    }),
                ),
            );
            void saveEntityLayout(
                endpoints.contexts,
                node.data.contextId,
                node.data.entityId,
                node.position,
                isPinned,
            ).catch((exception: unknown) =>
                setWorkspaceError(
                    exception instanceof Error
                        ? exception.message
                        : 'Não foi possível salvar o layout.',
                ),
            );
        },
        [
            activePerspectiveId,
            dropBody,
            endpoints.contexts,
            endpoints.perspectives,
        ],
    );

    const handleLocate = useCallback(
        async (target: ExplorerTarget) => {
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

    const handleDraftChange = useCallback(
        (content: string) => {
            session.change(content);
            setError(null);
        },
        [session],
    );

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
                mapDocuments(current, (document) =>
                    document.id === updated.id ? updated : document,
                ),
            );
            setActiveDocument((current) =>
                current?.id === updated.id
                    ? { ...current, ...updated }
                    : current,
            );
        },
        [endpoints.entities, focusedDocument, setActiveDocument],
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
        async (entityId: string, resultContextId: string) => {
            // Inside a space only its own notes are on the canvas, so a
            // result held by a nested context still has to be opened.
            const context = activeSpace.documents.some(
                (document) => document.id === entityId,
            )
                ? activeSpace
                : undefined;

            if (!context) {
                try {
                    await handleOpenContext(resultContextId);
                } catch (exception) {
                    setError(
                        exception instanceof Error
                            ? exception.message
                            : 'Não foi possível abrir o resultado.',
                    );

                    return;
                }
            }

            const matchingPerspective = perspectives.find((perspective) =>
                flattenContexts(applyPerspective(universes, perspective)).some(
                    (candidate) =>
                        candidate.documents.some(
                            (document) => document.id === entityId,
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
                    nodeId: entityNodeId(
                        context?.id ?? resultContextId,
                        entityId,
                    ),
                    entityId,
                    kind: 'document',
                });
            });
        },
        [
            activePerspectiveId,
            activeSpace,
            handleLocate,
            handleOpenContext,
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

            if (!(await session.flush())) {
                throw new Error(
                    'Não foi possível salvar a nota antes de restaurar.',
                );
            }

            await restoreVersion(endpoints.versions, versionId);
            router.reload({ only: ['vault', 'workspace'] });
        },
        [endpoints.versions, session],
    );

    const handleEntityDelete = useCallback(
        async (entityId: string) => {
            if (activeDocument?.id === entityId && !(await session.flush())) {
                throw new Error(
                    'Não foi possível salvar a nota antes de mover para a lixeira.',
                );
            }

            const deletion = await deleteEntity(endpoints.entities, entityId);

            setUniverses((current) =>
                mapDocuments(current, (document) =>
                    document.id === entityId ? null : document,
                ),
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
        [
            activeDocument?.id,
            activePerspectiveId,
            endpoints.entities,
            focusEntityId,
            persistWorkspace,
            session,
            setActiveDocument,
        ],
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
                flattenContexts(current).reduce((next, context) => {
                    const membership = memberships.get(context.id);

                    if (
                        !membership ||
                        context.documents.some(
                            (document) => document.id === entityId,
                        )
                    ) {
                        return next;
                    }

                    return updateContext(next, context.id, (candidate) => ({
                        ...candidate,
                        documents: [
                            ...candidate.documents,
                            {
                                ...restoration.entity,
                                position: membership.position,
                                isPinned: membership.isPinned,
                            },
                        ],
                    }));
                }, current),
            );
            setRelations((current) => [
                ...current,
                ...restoration.restoredRelations.filter(
                    (relation) =>
                        !current.some(
                            (existing) => existing.id === relation.id,
                        ),
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

            const addAttachment = <
                T extends { attachments?: AttachmentSummary[] },
            >(
                document: T,
            ): T => ({
                ...document,
                attachments: [...(document.attachments ?? []), attachment],
            });

            setUniverses((current) =>
                mapDocuments(current, (document) =>
                    document.id === focusedDocument.id
                        ? addAttachment(document)
                        : document,
                ),
            );
            setActiveDocument((current) =>
                current?.id === focusedDocument.id
                    ? addAttachment(current)
                    : current,
            );
        },
        [focusedDocument, setActiveDocument],
    );

    const handleBack = useCallback(async () => {
        if (!(await session.flush())) {
            return;
        }

        session.close();
        setError(null);

        if (returnViewport.current) {
            void flow?.setViewport(returnViewport.current);
        }
    }, [flow, session]);

    const handleReturnHome = useCallback(async () => {
        if (!navigation || navigationPending.current) {
            return;
        }

        navigationPending.current = true;

        try {
            if (await session.flush()) {
                router.visit(navigation.home);
            }
        } finally {
            navigationPending.current = false;
        }
    }, [navigation, session]);

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
                <VaultPath
                    breadcrumbs={breadcrumbs}
                    onOpenContext={(contextId) =>
                        void handleOpenContext(contextId).catch(
                            (exception: unknown) =>
                                setError(
                                    exception instanceof Error
                                        ? exception.message
                                        : 'Não foi possível abrir o assunto.',
                                ),
                        )
                    }
                />
                <div className="cvc-header__actions">
                    {navigation && (
                        <button
                            type="button"
                            className="cvc-button"
                            onClick={() => void handleReturnHome()}
                        >
                            Voltar ao Rechi OS
                        </button>
                    )}
                    <button
                        type="button"
                        className="cvc-button cvc-tools-toggle"
                        aria-label={
                            isToolsOpen
                                ? 'Fechar ferramentas'
                                : 'Abrir ferramentas'
                        }
                        aria-expanded={isToolsOpen}
                        aria-controls={toolsPanelId}
                        onClick={() => setIsToolsOpen((isOpen) => !isOpen)}
                    >
                        <span aria-hidden="true">☰</span>
                    </button>
                </div>
            </header>

            {(error || workspaceError) && !activeDocument && (
                <p className="cvc-page-error" role="alert">
                    {error ?? workspaceError}
                </p>
            )}

            <div className="cvc-workspace">
                <main
                    ref={canvas}
                    className="cvc-canvas"
                    aria-label="Canvas do vault"
                    aria-busy={isCreating}
                    onDoubleClick={handleCanvasDoubleClick}
                    style={
                        {
                            '--cvc-zoom': workspace.viewport.zoom,
                        } as CSSProperties
                    }
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        defaultViewport={workspace.viewport}
                        minZoom={zoomLimits.minZoom}
                        maxZoom={zoomLimits.maxZoom}
                        onInit={setFlow}
                        onMove={handleMove}
                        onMoveEnd={handleMoveEnd}
                        onNodeClick={handleNodeClick}
                        onNodeDrag={handleNodeDrag}
                        onNodeDragStop={handleNodeDragStop}
                        onNodeDoubleClick={handleNodeDoubleClick}
                        nodesDraggable
                        nodesFocusable
                        selectionOnDrag
                        zoomOnDoubleClick={false}
                    >
                        <Controls
                            position="bottom-right"
                            showInteractive={false}
                        />
                    </ReactFlow>
                </main>

                <aside
                    id={toolsPanelId}
                    className="cvc-tools"
                    aria-label="Ferramentas do vault"
                    hidden={!isToolsOpen}
                >
                    <VaultExplorer
                        universes={visibleUniverses}
                        isAtVaultRoot={activeContextId === null}
                        onLocate={(target) => void handleLocate(target)}
                        onOpenContext={handleOpenContext}
                        onCreateContext={handleCreateContext}
                    />
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
                                    updateContext(
                                        current,
                                        contextId,
                                        (context) => ({
                                            ...context,
                                            documents: [
                                                ...context.documents,
                                                {
                                                    ...focusedDocument,
                                                    position: null,
                                                    isPinned: false,
                                                },
                                            ],
                                        }),
                                    ),
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
                    error={saveError ?? error}
                    onChange={handleDraftChange}
                    onSave={() => void session.save()}
                    onBack={() => void handleBack()}
                />
            )}
        </div>
    );
}
