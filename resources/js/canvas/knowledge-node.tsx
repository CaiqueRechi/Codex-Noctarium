import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';

import type { SemanticLevel } from './semantic-zoom';

export type KnowledgeNodeData = {
    kind: 'universe' | 'context' | 'document';
    label: string;
    semanticLevel: SemanticLevel;
    entityId?: string;
    contextId?: string;
};

export type KnowledgeCanvasNode = Node<KnowledgeNodeData, 'knowledge'>;

export function KnowledgeNode({
    data,
    selected,
}: NodeProps<KnowledgeCanvasNode>) {
    const showsDetails = data.semanticLevel !== 'universe';

    return (
        <article
            className="cvc-knowledge-node"
            data-kind={data.kind}
            data-selected={selected ? 'true' : 'false'}
        >
            <Handle type="target" position={Position.Left} />
            <span className="cvc-knowledge-node__kind">
                {data.kind === 'universe'
                    ? 'Universo'
                    : data.kind === 'context'
                      ? 'Contexto'
                      : 'Documento'}
            </span>
            <strong>{data.label}</strong>
            {showsDetails && (
                <small>
                    {data.kind === 'universe'
                        ? 'Aproxime para explorar seus contextos'
                        : data.kind === 'context'
                          ? 'Aproxime para explorar os documentos'
                          : 'Clique duas vezes para editar'}
                </small>
            )}
            <Handle type="source" position={Position.Right} />
        </article>
    );
}
