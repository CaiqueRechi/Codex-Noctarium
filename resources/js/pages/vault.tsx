import { Head } from '@inertiajs/react';
import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
} from '@xyflow/react';
import type { Edge, NodeTypes, Viewport } from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';

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

type ContextSummary = {
    id: string;
    name: string;
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
        const contextNodes: KnowledgeCanvasNode[] = universe.contexts.map(
            (context, contextIndex) => ({
                id: context.id,
                type: 'knowledge',
                position: { x: 380, y: universeY + contextIndex * 180 },
                hidden: semanticLevel === 'universe',
                data: {
                    kind: 'context',
                    label: context.name,
                    semanticLevel,
                },
            }),
        );

        return [universeNode, ...contextNodes];
    });
}

function buildEdges(universes: UniverseSummary[]): Edge[] {
    return universes.flatMap((universe) =>
        universe.contexts.map((context) => ({
            id: `${universe.id}:${context.id}`,
            source: universe.id,
            target: context.id,
        })),
    );
}

export default function VaultPage({ vault }: VaultPageProps) {
    const [semanticLevel, setSemanticLevel] = useState<SemanticLevel>(() =>
        initialSemanticLevel(0.65),
    );
    const nodes = useMemo(
        () => buildNodes(vault.universes, semanticLevel),
        [semanticLevel, vault.universes],
    );
    const edges = useMemo(() => buildEdges(vault.universes), [vault.universes]);
    const handleMove = useCallback(
        (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
            setSemanticLevel((previousLevel) =>
                resolveSemanticLevel(viewport.zoom, previousLevel),
            );
        },
        [],
    );

    return (
        <div className="cvc-theme cvc-shell">
            <Head title="CVC" />
            <header className="cvc-header">
                <div>
                    <span className="cvc-eyebrow">Crow Vault Canvas</span>
                    <h1>{vault.name}</h1>
                </div>
                <output className="cvc-zoom-state" aria-live="polite">
                    Nível: {semanticLevelLabels[semanticLevel]}
                </output>
            </header>

            <main className="cvc-canvas" aria-label="Canvas do vault">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    defaultViewport={{ x: 120, y: 120, zoom: 0.65 }}
                    minZoom={0.25}
                    maxZoom={2}
                    onMove={handleMove}
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
        </div>
    );
}
