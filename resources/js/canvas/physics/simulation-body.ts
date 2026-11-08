import { radiusForArea } from '../math/geometry';
import type { CanvasPoint } from '../math/geometry';
import { requireFinite } from '../math/validate-measure';

export type SimulationBodyInput = {
    id: string;
    area: number;
    position: Readonly<CanvasPoint>;
    velocity?: Readonly<CanvasPoint>;
    isPinned: boolean;
};

export type SimulationBody = Readonly<{
    id: string;
    area: number;
    radius: number;
    position: Readonly<CanvasPoint>;
    velocity: Readonly<CanvasPoint>;
    isPinned: boolean;
}>;

export function copySimulationBody(input: SimulationBodyInput): SimulationBody {
    if (!input.id || !Number.isFinite(input.area) || input.area <= 0) {
        throw new RangeError(
            'Each simulation body requires an identity and positive finite area.',
        );
    }

    const velocity = input.isPinned
        ? { x: 0, y: 0 }
        : { ...(input.velocity ?? { x: 0, y: 0 }) };
    validatePoint(input.position);
    validatePoint(velocity);

    return {
        ...input,
        radius: radiusForArea(input.area),
        position: { ...input.position },
        velocity,
    };
}

export function validatePoint(point: Readonly<CanvasPoint>): void {
    requireFinite(point.x, 'Position or velocity x');
    requireFinite(point.y, 'Position or velocity y');
}

export function pairDirection(
    first: SimulationBody,
    second: SimulationBody,
): CanvasPoint & { distance: number } {
    const x = second.position.x - first.position.x;
    const y = second.position.y - first.position.y;
    const distance = Math.hypot(x, y);
    requireFinite(distance, 'Pair distance');

    if (distance > 0) {
        return { x: x / distance, y: y / distance, distance };
    }

    const orderedIds = [first.id, second.id].sort();
    let hash = 0;

    for (const character of JSON.stringify(orderedIds)) {
        hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
    }

    const angle = (hash / 0x100000000) * Math.PI * 2;
    const direction = first.id === orderedIds[0] ? 1 : -1;

    return {
        x: direction * Math.cos(angle),
        y: direction * Math.sin(angle),
        distance: 0,
    };
}
