import type { ContextSummary } from '../../explorer/vault-explorer';
import type { RelationSummary } from '../../relations/types';
import { contextNodeId, entityNodeId } from '../node-identifiers';
import type { SceneLink, SceneNote } from './cosmic-scene';

export type SpaceSceneInput = {
    notes: SceneNote[];
    links: SceneLink[];
};

export function describeSpaceScene(
    space: ContextSummary,
    relations: readonly RelationSummary[],
): SpaceSceneInput {
    const documentIds = new Set(space.documents.map((document) => document.id));

    return {
        notes: [
            ...space.documents.map((document) => ({
                id: entityNodeId(space.id, document.id),
                ownContent: document.ownContent ?? null,
                descendantContent: document.descendantContent ?? null,
                position: document.position ?? null,
                isPinned: document.isPinned ?? false,
            })),
            ...space.contexts.map((context) => ({
                id: contextNodeId(context.id),
                // A context that is not a note has no content of its own;
                // that is a known zero, not a missing measure.
                ownContent: context.ownContent ?? 0,
                descendantContent: context.descendantContent ?? null,
                position: null,
                isPinned: false,
            })),
        ],
        links: relations
            .filter(
                (relation) =>
                    (relation.contextId === null ||
                        relation.contextId === space.id) &&
                    documentIds.has(relation.sourceEntityId) &&
                    documentIds.has(relation.targetEntityId),
            )
            .map((relation) => ({
                sourceId: entityNodeId(space.id, relation.sourceEntityId),
                targetId: entityNodeId(space.id, relation.targetEntityId),
            })),
    };
}
