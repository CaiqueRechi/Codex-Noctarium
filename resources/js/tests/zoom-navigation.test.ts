import { describe, expect, it } from 'vitest';

import {
    circleOnScreen,
    enclosingCircle,
    viewportPlacingCircle,
} from '../canvas/math/geometry';
import {
    decideZoomNavigation,
    enterSpaceShare,
    leaveSpaceShare,
} from '../canvas/zoom-navigation';
import type { EnterableCircle } from '../canvas/zoom-navigation';
import { continueTrail } from '../explorer/navigation-trail';

const size = { width: 1000, height: 800 };
const shortSide = 800;

// A circle centred on the middle of the screen at zoom 1, whose diameter
// on screen is the given share of the smaller side.
function centred(share: number, entry: EnterableCircle['entry']): EnterableCircle {
    return { center: { x: 500, y: 400 }, radius: (share * shortSide) / 2, entry };
}

const viewport = { x: 0, y: 0, zoom: 1 };
const context = { kind: 'context', contextId: 'c' } as const;

describe('D-12 zoom navigation thresholds', () => {
    it('enters a circle under the middle once it covers 60 % of the smaller side', () => {
        const below = decideZoomNavigation({
            viewport,
            size,
            enterable: [centred(enterSpaceShare - 0.01, context)],
            spaceCircles: [{ center: { x: 500, y: 400 }, radius: 400 }],
            canLeave: true,
        });
        const at = decideZoomNavigation({
            viewport,
            size,
            enterable: [centred(enterSpaceShare, context)],
            spaceCircles: [{ center: { x: 500, y: 400 }, radius: 400 }],
            canLeave: true,
        });

        expect(below).toBeNull();
        expect(at).toEqual({
            kind: 'enter',
            entry: context,
            circle: { center: { x: 500, y: 400 }, radius: 240 },
        });
    });

    it('does not enter a large circle that is not under the middle', () => {
        const aside: EnterableCircle = {
            center: { x: 900, y: 400 },
            radius: 300,
            entry: context,
        };

        expect(
            decideZoomNavigation({
                viewport,
                size,
                enterable: [aside],
                spaceCircles: [aside],
                canLeave: false,
            }),
        ).toBeNull();
    });

    it('enters the candidate nearest the middle, a note through its space', () => {
        const far: EnterableCircle = {
            center: { x: 560, y: 400 },
            radius: 300,
            entry: context,
        };
        const near: EnterableCircle = {
            center: { x: 510, y: 400 },
            radius: 300,
            entry: { kind: 'note', entityId: 'n' },
        };

        expect(
            decideZoomNavigation({
                viewport,
                size,
                enterable: [far, near],
                spaceCircles: [far, near],
                canLeave: true,
            }),
        ).toMatchObject({ kind: 'enter', entry: { kind: 'note', entityId: 'n' } });
    });

    it('leaves once the whole open space shrinks to 30 %, only where there is a parent', () => {
        const space = [
            { center: { x: 500, y: 400 }, radius: (leaveSpaceShare * shortSide) / 2 },
        ];

        expect(
            decideZoomNavigation({
                viewport,
                size,
                enterable: [],
                spaceCircles: space,
                canLeave: true,
            }),
        ).toEqual({ kind: 'leave', circle: space[0] });
        expect(
            decideZoomNavigation({
                viewport,
                size,
                enterable: [],
                spaceCircles: space,
                canLeave: false,
            }),
        ).toBeNull();
    });

    it('stays on one level between the two thresholds', () => {
        const middle = (enterSpaceShare + leaveSpaceShare) / 2;

        expect(
            decideZoomNavigation({
                viewport,
                size,
                enterable: [centred(middle - 0.1, context)],
                spaceCircles: [centred(middle, context)],
                canLeave: true,
            }),
        ).toBeNull();
    });

    it('decides nothing before the screen has a size', () => {
        expect(
            decideZoomNavigation({
                viewport,
                size: { width: 0, height: 0 },
                enterable: [centred(1, context)],
                spaceCircles: [],
                canLeave: true,
            }),
        ).toBeNull();
    });
});

describe('placing the arriving space', () => {
    it('encloses every circle from the middle of their bounds', () => {
        expect(
            enclosingCircle([
                { center: { x: 0, y: 0 }, radius: 1 },
                { center: { x: 10, y: 0 }, radius: 1 },
            ]),
        ).toEqual({ center: { x: 5, y: 0 }, radius: 6 });
        expect(enclosingCircle([])).toBeNull();
    });

    it('puts a canvas circle exactly over a screen circle', () => {
        const canvasCircle = { center: { x: 100, y: -50 }, radius: 20 };
        const screenCircle = { center: { x: 400, y: 300 }, radius: 200 };
        const placed = viewportPlacingCircle(canvasCircle, screenCircle, {
            minZoom: 0.01,
            maxZoom: 100,
        });

        expect(circleOnScreen(placed, canvasCircle)).toEqual(screenCircle);
    });

    it('keeps the zoom within its limits', () => {
        expect(
            viewportPlacingCircle(
                { center: { x: 0, y: 0 }, radius: 1 },
                { center: { x: 0, y: 0 }, radius: 1000 },
                { minZoom: 0.01, maxZoom: 100 },
            ).zoom,
        ).toBe(100);
        expect(() =>
            viewportPlacingCircle(
                { center: { x: 0, y: 0 }, radius: 0 },
                { center: { x: 0, y: 0 }, radius: 1 },
                { minZoom: 0.01, maxZoom: 100 },
            ),
        ).toThrow(RangeError);
    });
});

describe('trail kept across the spaces of notes', () => {
    const universe = { id: 'u', name: 'Universo' };
    const context = { id: 'c', name: 'Contexto' };
    const noteSpace = { id: 's', name: 'Nota' };

    it('appends the space of a note entered from where it sits', () => {
        expect(
            continueTrail([universe, context], [noteSpace], { entering: true }),
        ).toEqual([universe, context, noteSpace]);
    });

    it('goes back along the trail it walked', () => {
        expect(
            continueTrail([universe, context, noteSpace], [universe, context], {
                entering: false,
            }),
        ).toEqual([universe, context]);
        expect(
            continueTrail([universe, context, noteSpace], [], { entering: false }),
        ).toEqual([]);
    });

    it('takes the server path for a jump to an unrelated place', () => {
        const elsewhere = [{ id: 'x', name: 'Outro universo' }];

        expect(
            continueTrail([universe, context], elsewhere, { entering: false }),
        ).toEqual(elsewhere);
    });
});
