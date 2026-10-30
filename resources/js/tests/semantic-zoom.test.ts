import { describe, expect, it } from 'vitest';

import {
    initialSemanticLevel,
    provisionalSemanticZoom,
    resolveSemanticLevel,
} from '../canvas/semantic-zoom';

describe('RF-02 semantic zoom', () => {
    it('maps the initial zoom to universe, context and document levels', () => {
        expect(initialSemanticLevel(0.5)).toBe('universe');
        expect(initialSemanticLevel(1)).toBe('context');
        expect(initialSemanticLevel(1.5)).toBe('document');
    });

    it('reveals contexts only after crossing the upper hysteresis boundary', () => {
        const nearBoundary = provisionalSemanticZoom.contextAt + 0.01;
        const crossedBoundary =
            provisionalSemanticZoom.contextAt +
            provisionalSemanticZoom.hysteresis;

        expect(resolveSemanticLevel(nearBoundary, 'universe')).toBe('universe');
        expect(resolveSemanticLevel(crossedBoundary, 'universe')).toBe(
            'context',
        );
    });

    it('does not oscillate while zoom remains inside the context hysteresis band', () => {
        expect(resolveSemanticLevel(0.74, 'context')).toBe('context');
        expect(resolveSemanticLevel(0.76, 'context')).toBe('context');
    });

    it('returns to the universe after crossing the lower hysteresis boundary', () => {
        const crossedBoundary =
            provisionalSemanticZoom.contextAt -
            provisionalSemanticZoom.hysteresis -
            0.01;

        expect(resolveSemanticLevel(crossedBoundary, 'context')).toBe(
            'universe',
        );
    });
});
