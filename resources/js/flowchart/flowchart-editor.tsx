import {
    applyNodeChanges,
    ConnectionMode,
    Controls,
    Handle,
    MarkerType,
    Position,
    ReactFlow,
} from '@xyflow/react';
import type {
    Connection,
    Edge,
    Node,
    NodeProps,
    NodeTypes,
} from '@xyflow/react';
import { useEffect, useMemo, useState } from 'react';

import { flowchartKinds, nextId } from './flowchart';
import type { Flowchart, FlowchartKind } from './flowchart';

type BlockData = { kind: FlowchartKind; text: string };
type BlockNode = Node<BlockData, 'block'>;

function Block({ data, selected }: NodeProps<BlockNode>) {
    return (
        <div
            className="cvc-flow-block"
            data-kind={data.kind}
            data-selected={selected ? 'true' : 'false'}
        >
            <Handle type="target" position={Position.Top} />
            <span>{data.text || ' '}</span>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}

const nodeTypes: NodeTypes = { block: Block };

type Selection = { kind: 'node' | 'edge'; id: string } | null;

type FlowchartEditorProps = {
    chart: Flowchart;
    onChange: (chart: Flowchart) => void;
};

/**
 * RF-04: blocks of the four kinds and arrows with text, placed by hand.
 * The physics of the notes never moves a block (canvas-cosmico-formulas.md,
 * section 9): a block stays where it is dropped.
 */
export function FlowchartEditor({ chart, onChange }: FlowchartEditorProps) {
    const [selection, setSelection] = useState<Selection>(null);
    const nodes = useMemo<BlockNode[]>(
        () =>
            chart.nodes.map((node) => ({
                id: node.id,
                type: 'block',
                position: { x: node.x, y: node.y },
                selected: selection?.kind === 'node' && selection.id === node.id,
                data: { kind: node.kind, text: node.text },
            })),
        [chart.nodes, selection],
    );
    // The library moves a block while it is dragged; the diagram records the
    // place where it is dropped.
    const [shownNodes, setShownNodes] = useState(nodes);

    useEffect(() => setShownNodes(nodes), [nodes]);

    const edges = useMemo<Edge[]>(
        () =>
            chart.edges.map((edge) => ({
                id: edge.id,
                source: edge.from,
                target: edge.to,
                label: edge.text || undefined,
                selected: selection?.kind === 'edge' && selection.id === edge.id,
                markerEnd: { type: MarkerType.ArrowClosed },
            })),
        [chart.edges, selection],
    );

    const addBlock = (kind: FlowchartKind) => {
        const id = nextId('n', chart.nodes);
        const last = chart.nodes.at(-1);
        onChange({
            ...chart,
            nodes: [
                ...chart.nodes,
                {
                    id,
                    kind,
                    text: flowchartKinds.find((option) => option.kind === kind)?.label ?? '',
                    x: last ? last.x : 0,
                    y: last ? last.y + 140 : 0,
                },
            ],
        });
        setSelection({ kind: 'node', id });
    };

    const connect = (connection: Connection) => {
        if (!connection.source || !connection.target || connection.source === connection.target) {
            return;
        }

        onChange({
            ...chart,
            edges: [
                ...chart.edges,
                {
                    id: nextId('e', chart.edges),
                    from: connection.source,
                    to: connection.target,
                    text: '',
                },
            ],
        });
    };

    const removeSelection = () => {
        if (!selection) {
            return;
        }

        onChange(
            selection.kind === 'node'
                ? {
                      ...chart,
                      nodes: chart.nodes.filter((node) => node.id !== selection.id),
                      edges: chart.edges.filter(
                          (edge) => edge.from !== selection.id && edge.to !== selection.id,
                      ),
                  }
                : { ...chart, edges: chart.edges.filter((edge) => edge.id !== selection.id) },
        );
        setSelection(null);
    };

    const selectedNode =
        selection?.kind === 'node'
            ? chart.nodes.find((node) => node.id === selection.id)
            : undefined;
    const selectedEdge =
        selection?.kind === 'edge'
            ? chart.edges.find((edge) => edge.id === selection.id)
            : undefined;
    const selectedText = selectedNode?.text ?? selectedEdge?.text;

    const editText = (text: string) =>
        onChange(
            selectedNode
                ? {
                      ...chart,
                      nodes: chart.nodes.map((node) =>
                          node.id === selectedNode.id ? { ...node, text } : node,
                      ),
                  }
                : {
                      ...chart,
                      edges: chart.edges.map((edge) =>
                          edge.id === selectedEdge?.id ? { ...edge, text } : edge,
                      ),
                  },
        );

    return (
        <div className="cvc-flowchart">
            <div className="cvc-flowchart__toolbar" role="toolbar" aria-label="Blocos do fluxograma">
                {flowchartKinds.map((option) => (
                    <button
                        key={option.kind}
                        type="button"
                        className="cvc-button"
                        onClick={() => addBlock(option.kind)}
                    >
                        + {option.label}
                    </button>
                ))}
                {selection && selectedText !== undefined && (
                    <>
                        <label className="cvc-flowchart__text">
                            <span className="cvc-eyebrow">
                                {selectedNode ? 'Texto do bloco' : 'Texto da seta'}
                            </span>
                            <input
                                className="cvc-input"
                                value={selectedText}
                                maxLength={500}
                                placeholder={selectedEdge ? 'Sim, Não…' : undefined}
                                onChange={(event) => editText(event.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            className="cvc-button cvc-button--danger"
                            onClick={removeSelection}
                        >
                            Remover
                        </button>
                    </>
                )}
            </div>
            <div className="cvc-flowchart__canvas">
                <ReactFlow
                    nodes={shownNodes}
                    edges={edges}
                    onNodesChange={(changes) =>
                        setShownNodes((current) => applyNodeChanges(changes, current))
                    }
                    nodeTypes={nodeTypes}
                    connectionMode={ConnectionMode.Loose}
                    fitView
                    onConnect={connect}
                    onNodeClick={(_event, node) => setSelection({ kind: 'node', id: node.id })}
                    onEdgeClick={(_event, edge) => setSelection({ kind: 'edge', id: edge.id })}
                    onPaneClick={() => setSelection(null)}
                    onNodeDragStop={(_event, node) =>
                        onChange({
                            ...chart,
                            nodes: chart.nodes.map((candidate) =>
                                candidate.id === node.id
                                    ? { ...candidate, x: node.position.x, y: node.position.y }
                                    : candidate,
                            ),
                        })
                    }
                    deleteKeyCode={null}
                >
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>
        </div>
    );
}
