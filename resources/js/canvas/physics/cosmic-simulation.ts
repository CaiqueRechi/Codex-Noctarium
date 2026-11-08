import {
    elasticForce,
    gravitationalForce,
    stiffnessForConnections,
} from '../math/forces';
import type { CanvasPoint } from '../math/geometry';
import { requireNonNegativeFinite } from '../math/validate-measure';
import {
    copySimulationBody,
    pairDirection,
    validatePoint,
} from './simulation-body';
import type { SimulationBody, SimulationBodyInput } from './simulation-body';
import { resolveSimulationParameters } from './simulation-parameters';
import type { SimulationParameters } from './simulation-parameters';
import {
    collectSpringConnections,
    connectionCount,
} from './spring-connections';
import type { SpringConnection } from './spring-connections';

export type SimulationSnapshot = {
    bodies: readonly SimulationBody[];
    isAtRest: boolean;
};

export class CosmicSimulation {
    private snapshot: SimulationSnapshot;
    private readonly parameters: Readonly<SimulationParameters>;
    private readonly connections: ReadonlyMap<
        string,
        ReadonlyMap<string, number>
    >;
    private accumulator = 0;
    private quietTime = 0;

    constructor(
        bodies: readonly SimulationBodyInput[],
        connections: readonly SpringConnection[] = [],
        parameters: Partial<SimulationParameters> = {},
    ) {
        const bodyIds = new Set(bodies.map((body) => body.id));

        if (bodyIds.size !== bodies.length) {
            throw new Error('Simulation body identities must be unique.');
        }

        this.parameters = resolveSimulationParameters(parameters);
        this.connections = collectSpringConnections(bodyIds, connections);
        this.snapshot = {
            bodies: bodies.map(copySimulationBody),
            isAtRest: bodies.every((body) => body.isPinned),
        };
    }

    getSnapshot(): SimulationSnapshot {
        return this.snapshot;
    }

    advance(elapsedSeconds: number): SimulationSnapshot {
        requireNonNegativeFinite(elapsedSeconds, 'Elapsed time');

        if (this.snapshot.isAtRest) {
            return this.snapshot;
        }

        this.accumulator += Math.min(
            elapsedSeconds,
            this.parameters.maximumElapsedTime,
        );

        while (
            this.accumulator + Number.EPSILON >= this.parameters.timeStep &&
            !this.snapshot.isAtRest
        ) {
            this.integrateStep();
            this.accumulator = Math.max(
                0,
                this.accumulator - this.parameters.timeStep,
            );
        }

        return this.snapshot;
    }

    moveBody(id: string, position: CanvasPoint): void {
        validatePoint(position);
        this.updateBody(id, (body) => ({
            ...body,
            position: { ...position },
            velocity: { x: 0, y: 0 },
        }));
    }

    pinBody(id: string): void {
        this.updateBody(id, (body) => ({
            ...body,
            isPinned: true,
            velocity: { x: 0, y: 0 },
        }));
    }

    releaseBody(id: string): void {
        this.updateBody(id, (body) => ({
            ...body,
            isPinned: false,
            velocity: { x: 0, y: 0 },
        }));
    }

    private updateBody(
        id: string,
        update: (body: SimulationBody) => SimulationBody,
    ): void {
        if (!this.snapshot.bodies.some((body) => body.id === id)) {
            throw new Error('The simulation body is missing.');
        }

        const bodies = this.snapshot.bodies.map((body) =>
            body.id === id ? update(body) : body,
        );
        this.snapshot = {
            bodies,
            isAtRest: bodies.every((body) => body.isPinned),
        };
        this.accumulator = 0;
        this.quietTime = 0;
    }

    private integrateStep(): void {
        const forces = this.calculateForces();
        const step = this.parameters.timeStep;
        const damping = Math.exp(-this.parameters.dampingRate * step);
        const bodies = this.snapshot.bodies.map((body, index) => {
            if (body.isPinned) {
                return body;
            }

            const velocity = {
                x:
                    (body.velocity.x + (forces[index].x / body.area) * step) *
                    damping,
                y:
                    (body.velocity.y + (forces[index].y / body.area) * step) *
                    damping,
            };
            const position = {
                x: body.position.x + velocity.x * step,
                y: body.position.y + velocity.y * step,
            };
            validatePoint(velocity);
            validatePoint(position);

            return { ...body, velocity, position };
        });
        const isQuiet = bodies.every(
            (body) =>
                Math.hypot(body.velocity.x, body.velocity.y) <
                this.parameters.restSpeed,
        );
        const quietTime = isQuiet ? this.quietTime + step : 0;
        const isAtRest =
            quietTime + Number.EPSILON >= this.parameters.restDuration;
        this.quietTime = quietTime;
        this.snapshot = {
            bodies: isAtRest
                ? bodies.map((body) => ({ ...body, velocity: { x: 0, y: 0 } }))
                : bodies,
            isAtRest,
        };
    }

    private calculateForces(): CanvasPoint[] {
        const bodies = this.snapshot.bodies;
        const forces = bodies.map(() => ({ x: 0, y: 0 }));

        for (let firstIndex = 0; firstIndex < bodies.length; firstIndex++) {
            for (
                let secondIndex = firstIndex + 1;
                secondIndex < bodies.length;
                secondIndex++
            ) {
                const first = bodies[firstIndex];
                const second = bodies[secondIndex];

                if (first.isPinned && second.isPinned) {
                    continue;
                }

                const direction = pairDirection(first, second);
                const radii = first.radius + second.radius;
                const gravity = gravitationalForce(
                    this.parameters.gravityConstant,
                    first.area,
                    second.area,
                    direction.distance,
                    this.parameters.minimumDistance,
                );
                const spring = elasticForce(
                    stiffnessForConnections(
                        this.parameters.springStiffness,
                        connectionCount(this.connections, first.id, second.id),
                    ),
                    direction.distance,
                    radii + this.parameters.springGap,
                );
                const contact =
                    this.parameters.contactStiffness *
                    Math.max(0, radii - direction.distance);
                const magnitude = gravity + spring - contact;
                const x = direction.x * magnitude;
                const y = direction.y * magnitude;
                forces[firstIndex].x += x;
                forces[firstIndex].y += y;
                forces[secondIndex].x -= x;
                forces[secondIndex].y -= y;
            }
        }

        return forces;
    }
}
