import { describe, expect, it } from 'vitest';

import { CosmicSimulation } from '../canvas/physics/cosmic-simulation';
import type { SimulationBodyInput } from '../canvas/physics/simulation-body';
import { defaultSimulationParameters } from '../canvas/physics/simulation-parameters';

function createBody(
    id: string,
    x: number,
    overrides: Partial<SimulationBodyInput> = {},
): SimulationBodyInput {
    return {
        id,
        area: 0.1,
        position: { x, y: 0 },
        isPinned: false,
        ...overrides,
    };
}

function simulate(
    simulation: CosmicSimulation,
    duration: number,
    framesPerSecond = 60,
) {
    for (let frame = 0; frame < duration * framesPerSecond; frame++) {
        simulation.advance(1 / framesPerSecond);
    }

    return simulation.getSnapshot();
}

describe('RF-03 D-03/D-04 deterministic note simulation', () => {
    it('attracts unconnected notes with gravity', () => {
        const simulation = new CosmicSimulation([
            createBody('a', 0),
            createBody('b', 1),
        ]);
        const result = simulation.advance(1 / 120);
        expect(result.bodies[0].position.x).toBeGreaterThan(0);
        expect(result.bodies[1].position.x).toBeLessThan(1);
    });

    it('keeps a pinned note exactly in place while it attracts a free note', () => {
        const simulation = new CosmicSimulation([
            createBody('a', 0, { isPinned: true, velocity: { x: 8, y: 7 } }),
            createBody('b', 1),
        ]);
        const result = simulation.advance(1 / 15);
        expect(result.bodies[0].position).toEqual({ x: 0, y: 0 });
        expect(result.bodies[0].velocity).toEqual({ x: 0, y: 0 });
        expect(result.bodies[1].position.x).toBeLessThan(1);
    });

    it('uses connection multiplicity to reinforce the elastic attraction', () => {
        const bodies = [createBody('a', 0), createBody('b', 2)];
        const once = new CosmicSimulation(bodies, [
            { sourceId: 'a', targetId: 'b' },
        ]);
        const thrice = new CosmicSimulation(bodies, [
            { sourceId: 'a', targetId: 'b', count: 2 },
            { sourceId: 'b', targetId: 'a' },
        ]);
        const onePosition = once.advance(1 / 120).bodies[0].position.x;
        const threePosition = thrice.advance(1 / 120).bodies[0].position.x;
        expect(threePosition).toBeGreaterThan(2.9 * onePosition);
    });

    it('separates large coincident notes with the explicitly corrected contact coefficient 32', () => {
        expect(defaultSimulationParameters.contactStiffness).toBe(32);
        const inputs = [
            createBody('a', 0, { area: 0.4 }),
            createBody('b', 0, { area: 0.4 }),
        ];
        const result = simulate(new CosmicSimulation(inputs), 20);
        const [first, second] = result.bodies;
        const distance = Math.hypot(
            first.position.x - second.position.x,
            first.position.y - second.position.y,
        );
        expect(distance).toBeGreaterThanOrEqual(
            0.99 * (first.radius + second.radius),
        );
        expect(result.isAtRest).toBe(true);
        expect(inputs.map((body) => body.position)).toEqual([
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ]);
    });

    it('uses a deterministic coincident-center direction independent of body order', () => {
        const first = new CosmicSimulation([
            createBody('a', 0),
            createBody('b', 0),
        ]);
        const reversed = new CosmicSimulation([
            createBody('b', 0),
            createBody('a', 0),
        ]);
        const one = first.advance(1 / 120).bodies;
        const two = reversed.advance(1 / 120).bodies;
        expect(one[0].position).toEqual(two[1].position);
        expect(one[1].position).toEqual(two[0].position);
    });

    it('dissipates isolated motion until rest rather than oscillating forever', () => {
        const simulation = new CosmicSimulation([
            createBody('moving', 0, { velocity: { x: 1, y: 0.5 } }),
        ]);
        let previousSpeed = Infinity;

        for (let step = 0; step < 360; step++) {
            const body = simulation.advance(1 / 120).bodies[0];
            const speed = Math.hypot(body.velocity.x, body.velocity.y);
            expect(speed).toBeLessThanOrEqual(previousSpeed);
            previousSpeed = speed;
        }

        expect(simulation.getSnapshot().isAtRest).toBe(true);
        expect(simulation.getSnapshot().bodies[0].velocity).toEqual({
            x: 0,
            y: 0,
        });
    });

    it('settles a connected pair and wakes it after moving or releasing a note', () => {
        const simulation = new CosmicSimulation(
            [createBody('a', 0), createBody('b', 2)],
            [{ sourceId: 'a', targetId: 'b' }],
        );
        expect(simulate(simulation, 60).isAtRest).toBe(true);
        simulation.moveBody('a', { x: -1, y: 0.2 });
        expect(simulation.getSnapshot().isAtRest).toBe(false);
        simulation.pinBody('a');
        const pinned = { ...simulation.getSnapshot().bodies[0].position };
        simulate(simulation, 1);
        expect(simulation.getSnapshot().bodies[0].position).toEqual(pinned);
        simulation.releaseBody('a');
        expect(simulation.getSnapshot().bodies[0].isPinned).toBe(false);
        expect(simulation.getSnapshot().isAtRest).toBe(false);
        simulate(simulation, 1);
        expect(simulation.getSnapshot().bodies[0].position).not.toEqual(pinned);
    });

    it('has the same result at 30, 60 and 120 Hz because integration uses fixed steps', () => {
        const inputs = [createBody('a', 0), createBody('b', 1)];
        const links = [{ sourceId: 'a', targetId: 'b' }];
        const at30 = simulate(new CosmicSimulation(inputs, links), 1, 30);
        const at60 = simulate(new CosmicSimulation(inputs, links), 1, 60);
        const at120 = simulate(new CosmicSimulation(inputs, links), 1, 120);
        expect(at30).toEqual(at60);
        expect(at60).toEqual(at120);
    });

    it('accumulates sub-step frames and bounds work after a suspended tab', () => {
        const bodies = [createBody('moving', 0, { velocity: { x: 1, y: 0 } })];
        const fractional = new CosmicSimulation(bodies);
        expect(fractional.advance(1 / 240).bodies[0].position.x).toBe(0);
        expect(fractional.advance(1 / 240)).toEqual(
            new CosmicSimulation(bodies).advance(1 / 120),
        );
        expect(new CosmicSimulation(bodies).advance(60)).toEqual(
            new CosmicSimulation(bodies).advance(1 / 15),
        );
    });

    it('returns a stable snapshot without work for empty or fully pinned scenes', () => {
        const empty = new CosmicSimulation([]);
        expect(empty.advance(1)).toBe(empty.getSnapshot());
        expect(empty.getSnapshot().isAtRest).toBe(true);
        const pinned = new CosmicSimulation([
            createBody('a', 1, { isPinned: true }),
        ]);
        expect(pinned.advance(1)).toBe(pinned.getSnapshot());
        expect(pinned.getSnapshot().bodies[0].position).toEqual({ x: 1, y: 0 });
    });

    it('does not mutate caller-owned positions, velocity, or connection inputs', () => {
        const input = createBody('a', 0, { velocity: { x: 1, y: 1 } });
        const simulation = new CosmicSimulation([input]);
        simulation.advance(1 / 15);
        expect(input.position).toEqual({ x: 0, y: 0 });
        expect(input.velocity).toEqual({ x: 1, y: 1 });
        const nextPosition = { x: 3, y: 4 };
        simulation.moveBody('a', nextPosition);
        nextPosition.x = 100;
        expect(simulation.getSnapshot().bodies[0].position).toEqual({
            x: 3,
            y: 4,
        });
    });

    it('fails closed on duplicate IDs, missing spring endpoints, and invalid parameters', () => {
        expect(
            () =>
                new CosmicSimulation([createBody('a', 0), createBody('a', 1)]),
        ).toThrow('unique');
        expect(
            () =>
                new CosmicSimulation(
                    [createBody('a', 0)],
                    [{ sourceId: 'a', targetId: 'external' }],
                ),
        ).toThrow('outside');
        expect(
            () =>
                new CosmicSimulation([createBody('a', 0)], [], { timeStep: 0 }),
        ).toThrow(RangeError);
        expect(
            () =>
                new CosmicSimulation([createBody('a', 0)], [], {
                    timeStep: Number.MIN_VALUE,
                }),
        ).toThrow(RangeError);
        expect(
            () =>
                new CosmicSimulation([createBody('a', 0)], [], {
                    minimumDistance: 0,
                }),
        ).toThrow(RangeError);
    });

    it.each([-1, NaN, Infinity])(
        'rejects invalid area, coordinates, velocity, and elapsed time: %s',
        (value) => {
            expect(
                () =>
                    new CosmicSimulation([createBody('a', 0, { area: value })]),
            ).toThrow(RangeError);
            expect(
                () =>
                    new CosmicSimulation([
                        createBody('a', 0, {
                            position: { x: value, y: Infinity },
                        }),
                    ]),
            ).toThrow(RangeError);
            expect(
                () =>
                    new CosmicSimulation([
                        createBody('a', 0, {
                            velocity: { x: value, y: Infinity },
                        }),
                    ]),
            ).toThrow(RangeError);
            const simulation = new CosmicSimulation([createBody('a', 0)]);
            expect(() => simulation.advance(value)).toThrow(RangeError);
            expect(simulation.getSnapshot().bodies[0].position).toEqual({
                x: 0,
                y: 0,
            });
        },
    );
});
