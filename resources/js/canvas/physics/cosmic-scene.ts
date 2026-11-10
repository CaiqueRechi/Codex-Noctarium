import { radiusForArea, toLogicalPoint } from '../math/geometry';
import type { CanvasPoint } from '../math/geometry';
import { combineContentWeight } from '../math/hierarchy-weight';
import { distributeSpaceBudget } from '../math/space-budget';
import type { SimulationBodyInput } from './simulation-body';
import type { SpringConnection } from './spring-connections';

export type SceneNote = {
    id: string;
    ownContent: number | null;
    descendantContent: number | null;
    position: Readonly<CanvasPoint> | null;
    isPinned: boolean;
};

export type SceneLink = { sourceId: string; targetId: string };

export type CosmicScene = {
    bodies: SimulationBodyInput[];
    connections: SpringConnection[];
    emptyArea: number;
    unmeasuredNoteIds: string[];
};

const goldenAngle = Math.PI * (3 - Math.sqrt(5));

export function buildCosmicScene(
    notes: readonly SceneNote[],
    links: readonly SceneLink[],
): CosmicScene {
    const budget = distributeSpaceBudget(
        notes.map((note) => ({
            id: note.id,
            weight: combineContentWeight(
                note.ownContent ?? 0,
                note.descendantContent ?? 0,
            ),
        })),
    );
    const areas = new Map(budget.allocations.map(({ id, area }) => [id, area]));
    const startingPoints = placeUnpositionedNotes(notes, areas);

    return {
        bodies: notes.map((note) => ({
            id: note.id,
            area: areas.get(note.id)!,
            position: note.position
                ? toLogicalPoint(note.position)
                : startingPoints.get(note.id)!,
            isPinned: note.isPinned,
        })),
        connections: links.filter(
            (link) => areas.has(link.sourceId) && areas.has(link.targetId),
        ),
        emptyArea: budget.emptyArea,
        unmeasuredNoteIds: notes
            .filter(
                (note) =>
                    note.ownContent === null || note.descendantContent === null,
            )
            .map((note) => note.id),
    };
}

// Notes that were never placed start on a spiral around the origin, in id
// order, so the same slice always opens the same way before physics settles it.
function placeUnpositionedNotes(
    notes: readonly SceneNote[],
    areas: ReadonlyMap<string, number>,
): Map<string, CanvasPoint> {
    const unpositioned = notes
        .filter((note) => note.position === null)
        .map((note) => note.id)
        .sort();
    const spacing =
        2 *
        Math.max(0, ...unpositioned.map((id) => radiusForArea(areas.get(id)!)));

    return new Map(
        unpositioned.map((id, index) => {
            const distance = spacing * Math.sqrt(index + 1);
            const angle = index * goldenAngle;

            return [
                id,
                {
                    x: distance * Math.cos(angle),
                    y: distance * Math.sin(angle),
                },
            ];
        }),
    );
}
