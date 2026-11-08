import {
    requireCount,
    requireFinite,
    requireNonNegativeFinite,
} from './validate-measure';

export function gravitationalForce(
    gravityConstant: number,
    firstMass: number,
    secondMass: number,
    distance: number,
    minimumDistance = 0.001,
): number {
    requireNonNegativeFinite(gravityConstant, 'Gravity constant');
    requireNonNegativeFinite(firstMass, 'First mass');
    requireNonNegativeFinite(secondMass, 'Second mass');
    requireNonNegativeFinite(distance, 'Distance');

    if (!Number.isFinite(minimumDistance) || minimumDistance <= 0) {
        throw new RangeError('Minimum distance must be positive and finite.');
    }

    const safeDistance = Math.max(distance, minimumDistance);
    const force =
        (gravityConstant * firstMass * secondMass) / safeDistance ** 2;
    requireNonNegativeFinite(force, 'Gravitational force');

    return force;
}

export function elasticForce(
    stiffness: number,
    distance: number,
    restLength: number,
): number {
    requireNonNegativeFinite(stiffness, 'Spring stiffness');
    requireNonNegativeFinite(distance, 'Distance');
    requireNonNegativeFinite(restLength, 'Spring rest length');
    const force = stiffness * (distance - restLength);
    requireFinite(force, 'Elastic force');

    return force;
}

export function stiffnessForConnections(
    baseStiffness: number,
    connectionCount: number,
): number {
    requireNonNegativeFinite(baseStiffness, 'Spring stiffness');
    requireCount(connectionCount, 'Connection count');
    const stiffness = baseStiffness * connectionCount;
    requireNonNegativeFinite(stiffness, 'Effective spring stiffness');

    return stiffness;
}
