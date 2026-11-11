import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';

import { truncateCanvasTitle } from './truncate-canvas-title';

export type CosmicNoteData = {
    kind: 'context' | 'document';
    label: string;
    diameter: number;
    isPinned: boolean;
    isUnmeasured: boolean;
    entityId?: string;
    contextId?: string;
};

export type CosmicNoteCanvasNode = Node<CosmicNoteData, 'cosmic'>;

export function CosmicNoteNode({
    data,
    selected,
}: NodeProps<CosmicNoteCanvasNode>) {
    return (
        <article
            className="cvc-cosmic-note"
            data-kind={data.kind}
            data-selected={selected ? 'true' : 'false'}
            data-pinned={data.isPinned ? 'true' : 'false'}
            data-unmeasured={data.isUnmeasured ? 'true' : 'false'}
            title={
                data.isUnmeasured
                    ? `${data.label} (tamanho provisório: conteúdo ainda não medido)`
                    : data.label
            }
        >
            <span
                className="cvc-cosmic-note__body"
                style={{ width: data.diameter, height: data.diameter }}
                aria-hidden="true"
            />
            <Handle
                className="cvc-cosmic-note__anchor"
                type="target"
                position={Position.Top}
                isConnectable={false}
            />
            <strong className="cvc-cosmic-note__title">
                {truncateCanvasTitle(data.label)}
            </strong>
            <Handle
                className="cvc-cosmic-note__anchor"
                type="source"
                position={Position.Bottom}
                isConnectable={false}
            />
        </article>
    );
}
