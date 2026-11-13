import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';

import { truncateCanvasTitle } from './truncate-canvas-title';

export type CosmicNoteData = {
    kind: 'context' | 'document';
    label: string;
    diameter: number;
    isPinned: boolean;
    isUnmeasured: boolean;
    color?: string | null;
    entityId?: string;
    contextId?: string;
};

export type CosmicNoteCanvasNode = Node<CosmicNoteData, 'cosmic'>;

// RN-02: the dot on a note's edge links it to another note when dragged
// there, and creates a linked sibling when clicked.
export const linkDotHandleId = 'link';
export const linkDotClassName = 'cvc-cosmic-note__dot';

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
            data-color={data.color ?? undefined}
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
            {data.kind === 'document' && (
                <Handle
                    id={linkDotHandleId}
                    className={linkDotClassName}
                    type="source"
                    position={Position.Right}
                    style={{ left: `calc(50% + ${data.diameter / 2}px)` }}
                    aria-label={`Conectar ${data.label}: arraste até outra nota, ou clique para criar uma nota ligada`}
                    title="Arraste até outra nota para ligar; clique para criar uma nota ligada"
                />
            )}
        </article>
    );
}
