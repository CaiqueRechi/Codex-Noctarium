import { requireNonNegativeFinite } from './validate-measure';

export type NoteSpaceWeight = { id: string; weight: number };
export type NoteSpaceAllocation = { id: string; weight: number; area: number };

const totalArea = 1;
const emptySpaceWeight = 2;
const minimumEmptyArea = 0.2;
const minimumNoteWeight = 1;

export function distributeSpaceBudget(notes: readonly NoteSpaceWeight[]): {
    totalArea: number;
    emptyArea: number;
    allocations: NoteSpaceAllocation[];
} {
    const noteIds = new Set<string>();
    let combinedWeight = 0;
    const weightedNotes = notes.map((note) => {
        requireNonNegativeFinite(note.weight, 'Note weight');

        if (noteIds.has(note.id)) {
            throw new Error('Each note must have one allocation per space.');
        }

        noteIds.add(note.id);
        const weight = Math.max(note.weight, minimumNoteWeight);
        combinedWeight += weight;

        return { id: note.id, weight };
    });
    requireNonNegativeFinite(combinedWeight, 'Combined note weight');

    if (weightedNotes.length === 0) {
        return { totalArea, emptyArea: totalArea, allocations: [] };
    }

    const emptyArea = Math.max(
        minimumEmptyArea,
        emptySpaceWeight / (emptySpaceWeight + combinedWeight),
    );
    const availableArea = totalArea - emptyArea;

    return {
        totalArea,
        emptyArea,
        allocations: weightedNotes.map((note) => ({
            ...note,
            area: availableArea * (note.weight / combinedWeight),
        })),
    };
}
