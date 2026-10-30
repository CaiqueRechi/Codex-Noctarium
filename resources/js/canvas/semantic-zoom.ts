export type SemanticLevel = 'universe' | 'context' | 'document';

export const provisionalSemanticZoom = Object.freeze({
    contextAt: 0.75,
    documentAt: 1.35,
    hysteresis: 0.08,
});

export function initialSemanticLevel(zoom: number): SemanticLevel {
    if (zoom >= provisionalSemanticZoom.documentAt) {
        return 'document';
    }

    if (zoom >= provisionalSemanticZoom.contextAt) {
        return 'context';
    }

    return 'universe';
}

export function resolveSemanticLevel(
    zoom: number,
    previousLevel: SemanticLevel,
): SemanticLevel {
    const { contextAt, documentAt, hysteresis } = provisionalSemanticZoom;

    if (previousLevel === 'universe') {
        if (zoom >= documentAt + hysteresis) {
            return 'document';
        }

        return zoom >= contextAt + hysteresis ? 'context' : 'universe';
    }

    if (previousLevel === 'document') {
        if (zoom < contextAt - hysteresis) {
            return 'universe';
        }

        return zoom < documentAt - hysteresis ? 'context' : 'document';
    }

    if (zoom < contextAt - hysteresis) {
        return 'universe';
    }

    return zoom >= documentAt + hysteresis ? 'document' : 'context';
}
