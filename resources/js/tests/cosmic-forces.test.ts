import { describe, expect, it } from 'vitest';

import {
    elasticForce,
    gravitationalForce,
    stiffnessForConnections,
} from '../canvas/math/forces';
import {
    preserveViewportCenter,
    radiusForArea,
    toCanvasPoint,
    toLogicalPoint,
} from '../canvas/math/geometry';

describe('RF-03 D-03 force laws', () => {
    it('reduces gravity to one quarter when distance doubles', () => {
        expect(gravitationalForce(0.0001, 0.2, 0.4, 2)).toBeCloseTo(
            gravitationalForce(0.0001, 0.2, 0.4, 1) / 4,
            12,
        );
    });

    it('doubles gravity when either mass doubles', () => {
        expect(gravitationalForce(1, 2, 3, 4)).toBeCloseTo(
            2 * gravitationalForce(1, 1, 3, 4),
            12,
        );
        expect(gravitationalForce(1, 1, 6, 4)).toBeCloseTo(
            2 * gravitationalForce(1, 1, 3, 4),
            12,
        );
    });

    it('uses the explicitly approved minimum distance at coincident centers', () => {
        expect(gravitationalForce(0.0001, 0.4, 0.4, 0)).toBe(
            gravitationalForce(0.0001, 0.4, 0.4, 0.001),
        );
        expect(Number.isFinite(gravitationalForce(0.0001, 0.4, 0.4, 0))).toBe(
            true,
        );
    });

    it('changes spring direction across equilibrium and is zero at d=L', () => {
        expect(elasticForce(0.2, 2, 2)).toBe(0);
        expect(elasticForce(0.2, 3, 2)).toBeCloseTo(0.2, 12);
        expect(elasticForce(0.2, 1, 2)).toBeCloseTo(-0.2, 12);
    });

    it('reinforces the spring linearly with connection count', () => {
        expect(stiffnessForConnections(0.2, 0)).toBe(0);
        expect(stiffnessForConnections(0.2, 3)).toBeCloseTo(0.6, 12);
        expect(elasticForce(stiffnessForConnections(0.2, 3), 3, 2)).toBeCloseTo(
            3 * elasticForce(0.2, 3, 2),
            12,
        );
    });

    it.each([-1, NaN, Infinity])(
        'rejects invalid physical values: %s',
        (value) => {
            expect(() => gravitationalForce(value, 1, 1, 1)).toThrow(
                RangeError,
            );
            expect(() => gravitationalForce(1, value, 1, 1)).toThrow(
                RangeError,
            );
            expect(() => gravitationalForce(1, 1, value, 1)).toThrow(
                RangeError,
            );
            expect(() => gravitationalForce(1, 1, 1, value)).toThrow(
                RangeError,
            );
            expect(() => elasticForce(1, value, 1)).toThrow(RangeError);
            expect(() => stiffnessForConnections(1, value)).toThrow(RangeError);
        },
    );

    it('rejects invalid minimum distances, fractional connections, and overflow', () => {
        expect(() => gravitationalForce(1, 1, 1, 1, 0)).toThrow(RangeError);
        expect(() => stiffnessForConnections(1, 0.5)).toThrow(RangeError);
        expect(() =>
            elasticForce(Number.MAX_VALUE, Number.MAX_VALUE, 0),
        ).toThrow(RangeError);
    });
});

describe('RF-03 D-03/D-06 area and coordinate geometry', () => {
    it('uses Ai as circular area and derives radius from Ai/pi', () => {
        expect(radiusForArea(Math.PI)).toBe(1);
        expect(radiusForArea(0)).toBe(0);
        expect(radiusForArea(4 * Math.PI)).toBe(2);
    });

    it('round trips existing signed coordinates through the approved scale without mutation', () => {
        const point = { x: -512, y: 2048 };
        expect(toLogicalPoint(point)).toEqual({ x: -0.5, y: 2 });
        expect(toCanvasPoint(toLogicalPoint(point))).toEqual(point);
        expect(point).toEqual({ x: -512, y: 2048 });
    });

    it('preserves the observed logical center and zoom after resizing', () => {
        const original = { x: -120, y: 40, zoom: 1.4 };
        const previous = { width: 1200, height: 800 };
        const next = { width: 360, height: 640 };
        const resized = preserveViewportCenter(original, previous, next);
        expect((previous.width / 2 - original.x) / original.zoom).toBeCloseTo(
            (next.width / 2 - resized.x) / resized.zoom,
            12,
        );
        expect((previous.height / 2 - original.y) / original.zoom).toBeCloseTo(
            (next.height / 2 - resized.y) / resized.zoom,
            12,
        );
        expect(resized.zoom).toBe(original.zoom);
        expect(preserveViewportCenter(resized, next, previous)).toEqual(
            original,
        );
    });

    it('rejects zero/invalid dimensions, non-finite positions, and coordinate overflow', () => {
        expect(() =>
            preserveViewportCenter(
                { x: 0, y: 0, zoom: 1 },
                { width: 0, height: 10 },
                { width: 20, height: 20 },
            ),
        ).toThrow(RangeError);
        expect(() =>
            preserveViewportCenter(
                { x: 0, y: 0, zoom: 0 },
                { width: 10, height: 10 },
                { width: 20, height: 20 },
            ),
        ).toThrow(RangeError);
        expect(() => toLogicalPoint({ x: NaN, y: 1 })).toThrow(RangeError);
        expect(() => toCanvasPoint({ x: Number.MAX_VALUE, y: 1 })).toThrow(
            RangeError,
        );
        expect(() => radiusForArea(-1)).toThrow(RangeError);
    });
});
