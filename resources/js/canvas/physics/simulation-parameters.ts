import { requireNonNegativeFinite } from '../math/validate-measure';

export type SimulationParameters = {
    gravityConstant: number;
    springStiffness: number;
    springGap: number;
    contactStiffness: number;
    dampingRate: number;
    timeStep: number;
    maximumElapsedTime: number;
    minimumDistance: number;
    restSpeed: number;
    restDuration: number;
};

export const defaultSimulationParameters: Readonly<SimulationParameters> =
    Object.freeze({
        gravityConstant: 0.0001,
        springStiffness: 0.2,
        springGap: 0.04,
        contactStiffness: 32,
        dampingRate: 6,
        timeStep: 1 / 120,
        maximumElapsedTime: 1 / 15,
        minimumDistance: 0.001,
        restSpeed: 0.0001,
        restDuration: 0.5,
    });

export function resolveSimulationParameters(
    overrides: Partial<SimulationParameters>,
): Readonly<SimulationParameters> {
    const parameters = { ...defaultSimulationParameters, ...overrides };

    for (const [name, value] of Object.entries(parameters)) {
        requireNonNegativeFinite(value, name);
    }

    if (
        parameters.timeStep === 0 ||
        parameters.maximumElapsedTime < parameters.timeStep ||
        parameters.maximumElapsedTime / parameters.timeStep > 1024 ||
        parameters.minimumDistance === 0 ||
        parameters.restDuration === 0
    ) {
        throw new RangeError(
            'Time step, minimum distance, and rest duration must be positive; elapsed limit must cover a step.',
        );
    }

    return Object.freeze(parameters);
}
