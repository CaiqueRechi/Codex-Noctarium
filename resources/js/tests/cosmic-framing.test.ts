import { describe, expect, it } from 'vitest';

import { frameCircles, viewportCenter } from '../canvas/math/geometry';

const screen = { width: 1000, height: 500 };
const fit = { minZoom: 0.25, maxZoom: 2, margin: 0.1 };

describe('RF-01 canvas point at the middle of the screen', () => {
    it('undoes the pan and the zoom of the viewport', () => {
        expect(viewportCenter({ x: 100, y: -50, zoom: 2 }, screen)).toEqual({
            x: 200,
            y: 150,
        });
        expect(viewportCenter({ x: 500, y: 250, zoom: 0.5 }, screen)).toEqual({
            x: 0,
            y: 0,
        });
    });

    it('has no answer while the screen has no size', () => {
        expect(
            viewportCenter({ x: 0, y: 0, zoom: 1 }, { width: 0, height: 0 }),
        ).toBeNull();
    });
});

describe('RF-01 viewport that frames a whole space', () => {
    it('centres one circle and leaves the margin on the tighter side', () => {
        const viewport = frameCircles(
            [{ center: { x: 300, y: -200 }, radius: 100 }],
            screen,
            fit,
        );

        expect(viewport).toEqual({
            x: 500 - 300 * 2,
            y: 250 + 200 * 2,
            zoom: 2,
        });
    });

    it('zooms out until every circle fits between the margins', () => {
        const viewport = frameCircles(
            [
                { center: { x: -1000, y: 0 }, radius: 500 },
                { center: { x: 1000, y: 0 }, radius: 500 },
            ],
            screen,
            fit,
        )!;

        expect(viewport.zoom).toBeCloseTo(800 / 3000, 12);
        expect(viewport.x).toBeCloseTo(500, 12);
        expect(viewport.y).toBeCloseTo(250, 12);
    });

    it('stops at the zoom limits instead of shrinking or growing without end', () => {
        expect(
            frameCircles(
                [
                    { center: { x: 0, y: 0 }, radius: 1 },
                    { center: { x: 100000, y: 0 }, radius: 1 },
                ],
                screen,
                fit,
            )!.zoom,
        ).toBe(0.25);
        expect(
            frameCircles([{ center: { x: 0, y: 0 }, radius: 1 }], screen, fit)!
                .zoom,
        ).toBe(2);
    });

    it('has nothing to frame in an empty space or on a screen with no size', () => {
        expect(frameCircles([], screen, fit)).toBeNull();
        expect(
            frameCircles(
                [{ center: { x: 0, y: 0 }, radius: 10 }],
                { width: 0, height: 500 },
                fit,
            ),
        ).toBeNull();
    });
});
