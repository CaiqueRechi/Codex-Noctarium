import { describe, expect, it } from 'vitest';

import { canvasUnitsPerLogicalUnit } from '../canvas/math/geometry';
import { buildCosmicScene } from '../canvas/physics/cosmic-scene';
import type { SceneNote } from '../canvas/physics/cosmic-scene';
import { CosmicSimulation } from '../canvas/physics/cosmic-simulation';

function note(id: string, overrides: Partial<SceneNote> = {}): SceneNote {
    return {
        id,
        ownContent: 0,
        descendantContent: 0,
        position: { x: 0, y: 0 },
        isPinned: false,
        ...overrides,
    };
}

function areaOf(scene: ReturnType<typeof buildCosmicScene>, id: string) {
    return scene.bodies.find((body) => body.id === id)!.area;
}

describe('RF-03 scene built from the measures of a slice', () => {
    it('weighs own content by 0.5 and descendant content by 0.8', () => {
        const scene = buildCosmicScene(
            [
                note('own', { ownContent: 8 }),
                note('descendants', { descendantContent: 5 }),
            ],
            [],
        );

        expect(areaOf(scene, 'own')).toBeCloseTo(
            areaOf(scene, 'descendants'),
            12,
        );
    });

    it('shares the fixed budget in proportion to the weights', () => {
        const scene = buildCosmicScene(
            [
                note('small', { ownContent: 4 }),
                note('large', { ownContent: 12 }),
            ],
            [],
        );
        const occupied = areaOf(scene, 'small') + areaOf(scene, 'large');

        expect(areaOf(scene, 'large')).toBeCloseTo(
            3 * areaOf(scene, 'small'),
            12,
        );
        expect(occupied + scene.emptyArea).toBeCloseTo(1, 12);
        expect(scene.emptyArea).toBeCloseTo(0.2, 12);
    });

    it('gives an empty note the minimum weight instead of no area', () => {
        const scene = buildCosmicScene(
            [note('empty'), note('written', { ownContent: 2 })],
            [],
        );

        expect(areaOf(scene, 'empty')).toBeCloseTo(
            areaOf(scene, 'written'),
            12,
        );
        expect(scene.unmeasuredNoteIds).toEqual([]);
    });

    it('sizes an unmeasured note at the minimum and reports it', () => {
        const scene = buildCosmicScene(
            [
                note('unknown', { ownContent: null }),
                note('unknownBelow', { descendantContent: null }),
                note('written', { ownContent: 2 }),
            ],
            [],
        );

        expect(areaOf(scene, 'unknown')).toBeCloseTo(
            areaOf(scene, 'written'),
            12,
        );
        expect(scene.unmeasuredNoteIds).toEqual(['unknown', 'unknownBelow']);
    });

    it('converts stored canvas positions to logical units and keeps pins', () => {
        const scene = buildCosmicScene(
            [
                note('pinned', {
                    position: { x: canvasUnitsPerLogicalUnit, y: -512 },
                    isPinned: true,
                }),
            ],
            [],
        );

        expect(scene.bodies[0].position).toEqual({ x: 1, y: -0.5 });
        expect(scene.bodies[0].isPinned).toBe(true);
    });

    it('places notes that were never positioned apart and reproducibly', () => {
        const notes = ['c', 'a', 'b'].map((id) => note(id, { position: null }));
        const first = buildCosmicScene(notes, []);
        const again = buildCosmicScene([...notes].reverse(), []);
        const positionOf = (
            scene: ReturnType<typeof buildCosmicScene>,
            id: string,
        ) => scene.bodies.find((body) => body.id === id)!.position;

        for (const id of ['a', 'b', 'c']) {
            expect(positionOf(again, id)).toEqual(positionOf(first, id));
        }

        const distance = Math.hypot(
            positionOf(first, 'a').x - positionOf(first, 'b').x,
            positionOf(first, 'a').y - positionOf(first, 'b').y,
        );
        expect(distance).toBeGreaterThan(0);
    });

    it('keeps links inside the space and drops links to notes outside it', () => {
        const scene = buildCosmicScene(
            [note('a'), note('b', { position: { x: 512, y: 0 } })],
            [
                { sourceId: 'a', targetId: 'b' },
                { sourceId: 'a', targetId: 'outside' },
            ],
        );

        expect(scene.connections).toEqual([{ sourceId: 'a', targetId: 'b' }]);
    });

    it('produces a scene the simulator accepts and can advance', () => {
        const scene = buildCosmicScene(
            [
                note('a', { ownContent: 5.4, position: null }),
                note('b', {
                    ownContent: 7,
                    descendantContent: 1.8,
                    position: null,
                }),
                note('c', { position: { x: 300, y: 200 }, isPinned: true }),
            ],
            [
                { sourceId: 'a', targetId: 'b' },
                { sourceId: 'b', targetId: 'outside' },
            ],
        );
        const simulation = new CosmicSimulation(
            scene.bodies,
            scene.connections,
        );
        const result = simulation.advance(1 / 60);

        expect(result.bodies).toHaveLength(3);
        expect(result.bodies[2].position).toEqual({
            x: 300 / canvasUnitsPerLogicalUnit,
            y: 200 / canvasUnitsPerLogicalUnit,
        });
    });

    it('builds an empty scene for an empty space', () => {
        const scene = buildCosmicScene([], []);

        expect(scene.bodies).toEqual([]);
        expect(scene.emptyArea).toBe(1);
    });
});
