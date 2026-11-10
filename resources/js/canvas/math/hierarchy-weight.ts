import { requireNonNegativeFinite } from './validate-measure';

export type ContentHierarchyNode = {
    ownContent: number;
    childIds: readonly string[];
};

export type HierarchicalContentWeight = {
    ownContent: number;
    descendantContent: number;
    weight: number;
};

const ownContentCoefficient = 0.5;
const descendantContentCoefficient = 0.8;

export function combineContentWeight(
    ownContent: number,
    descendantContent: number,
): number {
    return (
        ownContentCoefficient * ownContent +
        descendantContentCoefficient * descendantContent
    );
}

export function calculateHierarchicalContentWeight(
    rootId: string,
    notes: ReadonlyMap<string, ContentHierarchyNode>,
): HierarchicalContentWeight {
    const root = notes.get(rootId);

    if (!root) {
        throw new Error('The root note is missing.');
    }

    const visited = new Set<string>();
    const activePath = new Set<string>();
    const pending: { id: string; phase: 'enter' | 'exit' }[] = [
        { id: rootId, phase: 'enter' },
    ];
    let descendantContent = 0;

    while (pending.length > 0) {
        const current = pending.pop()!;

        if (current.phase === 'exit') {
            activePath.delete(current.id);
            continue;
        }

        if (activePath.has(current.id)) {
            throw new Error('The note hierarchy contains a cycle.');
        }

        if (visited.has(current.id)) {
            continue;
        }

        const note = notes.get(current.id);

        if (!note) {
            throw new Error('A descendant note is missing.');
        }

        requireNonNegativeFinite(note.ownContent, 'Own content');
        visited.add(current.id);
        activePath.add(current.id);

        if (current.id !== rootId) {
            descendantContent += note.ownContent;
        }

        pending.push({ id: current.id, phase: 'exit' });

        for (const childId of note.childIds) {
            pending.push({ id: childId, phase: 'enter' });
        }
    }

    const weight = combineContentWeight(root.ownContent, descendantContent);
    requireNonNegativeFinite(descendantContent, 'Descendant content');
    requireNonNegativeFinite(weight, 'Hierarchical content weight');

    return { ownContent: root.ownContent, descendantContent, weight };
}
