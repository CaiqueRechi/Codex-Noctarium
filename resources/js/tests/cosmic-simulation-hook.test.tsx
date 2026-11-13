import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCosmicScene } from '../canvas/physics/cosmic-scene';
import type { CosmicScene, SceneNote } from '../canvas/physics/cosmic-scene';
import { useCosmicSimulation } from '../canvas/physics/use-cosmic-simulation';

let pendingFrames: Array<(time: number) => void> = [];
let clock = 0;

function runFrames(count: number): void {
    act(() => {
        for (let index = 0; index < count; index++) {
            const frames = pendingFrames;
            pendingFrames = [];
            clock += 1000 / 60;
            frames.forEach((frame) => frame(clock));
        }
    });
}

function note(id: string, overrides: Partial<SceneNote> = {}): SceneNote {
    return {
        id,
        ownContent: 0,
        descendantContent: 0,
        position: { x: 0, y: 0 },
        isPinned: false,
        ...overrides,
    };
}

function apart(): CosmicScene {
    return buildCosmicScene(
        [
            note('left', { position: { x: -2048, y: 0 } }),
            note('right', { position: { x: 2048, y: 0 } }),
        ],
        [{ sourceId: 'left', targetId: 'right' }],
    );
}

function positionOf(
    bodies: ReturnType<typeof useCosmicSimulation>['bodies'],
    id: string,
) {
    return bodies.find((body) => body.id === id)!.position;
}

describe('RF-03 simulation driven by animation frames', () => {
    beforeEach(() => {
        pendingFrames = [];
        clock = 0;
        vi.stubGlobal(
            'requestAnimationFrame',
            (frame: (time: number) => void) => pendingFrames.push(frame),
        );
        vi.stubGlobal('cancelAnimationFrame', () => {
            pendingFrames = [];
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('has no bodies and asks for no frame without a scene', () => {
        const { result } = renderHook(() => useCosmicSimulation(null));

        expect(result.current.bodies).toEqual([]);
        expect(pendingFrames).toHaveLength(0);
    });

    it('starts from the scene and moves connected notes together', () => {
        const scene = apart();
        const { result } = renderHook(() => useCosmicSimulation(scene));

        expect(positionOf(result.current.bodies, 'left').x).toBe(-2);

        runFrames(30);

        expect(positionOf(result.current.bodies, 'left').x).toBeGreaterThan(-2);
        expect(positionOf(result.current.bodies, 'right').x).toBeLessThan(2);
    });

    it('stops asking for frames once every note is at rest', () => {
        const scene = buildCosmicScene([note('only', { isPinned: true })], []);
        renderHook(() => useCosmicSimulation(scene));

        runFrames(2);

        expect(pendingFrames).toHaveLength(0);
    });

    it('holds a dragged note where the pointer is while the others react', () => {
        const scene = apart();
        const { result } = renderHook(() => useCosmicSimulation(scene));

        act(() => result.current.holdBody('left', { x: -1, y: 0.5 }));
        runFrames(30);

        expect(positionOf(result.current.bodies, 'left')).toEqual({
            x: -1,
            y: 0.5,
        });
        expect(positionOf(result.current.bodies, 'right').x).toBeLessThan(2);
    });

    it('lets a note dropped freely move again and keeps a pinned one still', () => {
        const scene = apart();
        const { result } = renderHook(() => useCosmicSimulation(scene));

        act(() => result.current.holdBody('left', { x: -1, y: 0 }));
        act(() => result.current.dropBody('left', false));
        runFrames(30);

        expect(positionOf(result.current.bodies, 'left').x).not.toBe(-1);

        act(() => result.current.holdBody('right', { x: 1, y: 0 }));
        act(() => result.current.dropBody('right', true));
        runFrames(30);

        expect(positionOf(result.current.bodies, 'right')).toEqual({
            x: 1,
            y: 0,
        });
        expect(
            result.current.bodies.find((body) => body.id === 'right')!.isPinned,
        ).toBe(true);
    });

    it('keeps settled positions when the scene is rebuilt without layout changes', () => {
        const { result, rerender } = renderHook(
            ({ scene }) => useCosmicSimulation(scene),
            { initialProps: { scene: apart() } },
        );

        runFrames(30);
        const settled = positionOf(result.current.bodies, 'left');

        rerender({ scene: apart() });

        expect(positionOf(result.current.bodies, 'left')).toEqual(settled);
    });

    it('takes the stored position again when the layout of a note changed', () => {
        const { result, rerender } = renderHook(
            ({ scene }) => useCosmicSimulation(scene),
            { initialProps: { scene: apart() } },
        );

        runFrames(30);
        rerender({
            scene: buildCosmicScene(
                [
                    note('left', { position: { x: -4096, y: 0 } }),
                    note('right', { position: { x: 2048, y: 0 } }),
                ],
                [],
            ),
        });

        expect(positionOf(result.current.bodies, 'left')).toEqual({
            x: -4,
            y: 0,
        });
    });

    it('cancels the pending frame when the canvas goes away', () => {
        const scene = apart();
        const { unmount } = renderHook(() => useCosmicSimulation(scene));

        expect(pendingFrames).toHaveLength(1);

        unmount();

        expect(pendingFrames).toHaveLength(0);
    });
});
