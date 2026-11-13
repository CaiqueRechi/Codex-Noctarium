import { describe, expect, it } from 'vitest';

import { describeSpaceScene } from '../canvas/physics/space-scene';
import type { DocumentSummary } from '../documents/types';
import type { ContextSummary } from '../explorer/vault-explorer';
import type { RelationSummary } from '../relations/types';

function note(
    id: string,
    overrides: Partial<DocumentSummary> = {},
): DocumentSummary {
    return {
        id,
        title: id,
        revision: 1,
        entityType: null,
        properties: {},
        ...overrides,
    };
}

function space(overrides: Partial<ContextSummary> = {}): ContextSummary {
    return {
        id: 'space',
        parentId: null,
        kind: 'context',
        name: 'Espaço',
        hasChildren: false,
        documents: [],
        contexts: [],
        ...overrides,
    };
}

function relation(
    sourceEntityId: string,
    targetEntityId: string,
    contextId: string | null = null,
): RelationSummary {
    return {
        id: `${sourceEntityId}-${targetEntityId}`,
        sourceEntityId,
        targetEntityId,
        contextId,
        relationType: null,
        isDirected: false,
        properties: {},
    };
}

describe('RF-03 scene input taken from one space of a slice', () => {
    it('describes each note of the space by its canvas node identity', () => {
        const { notes } = describeSpaceScene(
            space({
                documents: [
                    note('measured', {
                        ownContent: 12,
                        descendantContent: 3,
                        position: { x: 512, y: -256 },
                        isPinned: true,
                    }),
                ],
            }),
            [],
        );

        expect(notes).toEqual([
            {
                id: 'entity:space:measured',
                ownContent: 12,
                descendantContent: 3,
                position: { x: 512, y: -256 },
                isPinned: true,
            },
        ]);
    });

    it('keeps an unmeasured or never placed note unknown instead of zero', () => {
        const { notes } = describeSpaceScene(
            space({ documents: [note('fresh')] }),
            [],
        );

        expect(notes[0]).toMatchObject({
            ownContent: null,
            descendantContent: null,
            position: null,
            isPinned: false,
        });
    });

    it('adds each nested context as a free body sized by its measures', () => {
        const { notes } = describeSpaceScene(
            space({
                contexts: [
                    space({
                        id: 'nested',
                        ownContent: 4,
                        descendantContent: 20,
                        documents: [note('inside-nested')],
                    }),
                ],
            }),
            [],
        );

        expect(notes).toEqual([
            {
                id: 'context:nested',
                ownContent: 4,
                descendantContent: 20,
                position: null,
                isPinned: false,
            },
        ]);
    });

    it('counts a nested context that is not a note as having no own content', () => {
        const { notes } = describeSpaceScene(
            space({ contexts: [space({ id: 'plain', descendantContent: 7 })] }),
            [],
        );

        expect(notes[0]).toMatchObject({ ownContent: 0, descendantContent: 7 });
    });

    it('links only notes that are both in the space', () => {
        const { links } = describeSpaceScene(
            space({ documents: [note('a'), note('b')] }),
            [
                relation('a', 'b'),
                relation('a', 'b', 'space'),
                relation('a', 'b', 'another-space'),
                relation('a', 'outside'),
            ],
        );

        expect(links).toEqual([
            { sourceId: 'entity:space:a', targetId: 'entity:space:b' },
            { sourceId: 'entity:space:a', targetId: 'entity:space:b' },
        ]);
    });
});
