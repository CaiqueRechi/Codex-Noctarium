import { useCallback, useEffect, useRef, useState } from 'react';

import type { CanvasPoint } from '../math/geometry';
import type { CosmicScene } from './cosmic-scene';
import { CosmicSimulation } from './cosmic-simulation';
import { copySimulationBody } from './simulation-body';
import type { SimulationBody } from './simulation-body';

export type CosmicSimulationControls = {
    bodies: readonly SimulationBody[];
    holdBody: (id: string, position: CanvasPoint) => void;
    dropBody: (id: string, isPinned: boolean) => void;
};

type SceneBodies = {
    scene: CosmicScene | null;
    bodies: readonly SimulationBody[];
};

type RunningSimulation = { scene: CosmicScene; engine: CosmicSimulation };

const noBodies: readonly SimulationBody[] = Object.freeze([]);

// The scene must keep its identity between renders (memoize it): every new
// scene object restarts the simulation.
export function useCosmicSimulation(
    scene: CosmicScene | null,
): CosmicSimulationControls {
    const running = useRef<RunningSimulation | null>(null);
    const pendingFrame = useRef<number | null>(null);
    const [start, setStart] = useState<SceneBodies>(() =>
        startBodies(scene, null, noBodies),
    );
    const [live, setLive] = useState<SceneBodies | null>(null);
    const bodies =
        live && live.scene === start.scene ? live.bodies : start.bodies;

    if (start.scene !== scene) {
        setStart(startBodies(scene, start.scene, bodies));
    }

    const run = useCallback(() => {
        if (pendingFrame.current !== null) {
            return;
        }

        let previousTime: number | null = null;
        const step = (time: number) => {
            const current = running.current;

            if (!current) {
                pendingFrame.current = null;

                return;
            }

            const elapsedSeconds =
                previousTime === null
                    ? 0
                    : Math.max(0, time - previousTime) / 1000;
            previousTime = time;
            const snapshot = current.engine.advance(elapsedSeconds);
            setLive({ scene: current.scene, bodies: snapshot.bodies });
            pendingFrame.current = snapshot.isAtRest
                ? null
                : window.requestAnimationFrame(step);
        };

        pendingFrame.current = window.requestAnimationFrame(step);
    }, []);

    useEffect(() => {
        if (!start.scene) {
            running.current = null;

            return;
        }

        running.current = {
            scene: start.scene,
            engine: new CosmicSimulation(start.bodies, start.scene.connections),
        };
        run();
    }, [run, start]);

    useEffect(
        () => () => {
            if (pendingFrame.current !== null) {
                window.cancelAnimationFrame(pendingFrame.current);
                pendingFrame.current = null;
            }
        },
        [],
    );

    const change = useCallback(
        (update: (engine: CosmicSimulation) => void) => {
            const current = running.current;

            if (!current) {
                return;
            }

            update(current.engine);
            setLive({
                scene: current.scene,
                bodies: current.engine.getSnapshot().bodies,
            });
            run();
        },
        [run],
    );

    const holdBody = useCallback(
        (id: string, position: CanvasPoint) =>
            change((engine) => {
                engine.pinBody(id);
                engine.moveBody(id, position);
            }),
        [change],
    );

    const dropBody = useCallback(
        (id: string, isPinned: boolean) =>
            change((engine) => {
                if (isPinned) {
                    engine.pinBody(id);
                } else {
                    engine.releaseBody(id);
                }
            }),
        [change],
    );

    return { bodies, holdBody, dropBody };
}

// A scene is rebuilt whenever the page state changes. A body whose stored
// position and pin did not change keeps where the physics had taken it;
// otherwise every unrelated update would throw the space back to its start.
function startBodies(
    scene: CosmicScene | null,
    previousScene: CosmicScene | null,
    liveBodies: readonly SimulationBody[],
): SceneBodies {
    if (!scene) {
        return { scene, bodies: noBodies };
    }

    const previousInputs = new Map(
        (previousScene?.bodies ?? []).map((body) => [body.id, body]),
    );
    const live = new Map(liveBodies.map((body) => [body.id, body]));

    return {
        scene,
        bodies: scene.bodies.map((body) => {
            const previous = previousInputs.get(body.id);
            const current = live.get(body.id);
            const keepsItsLayout =
                previous !== undefined &&
                current !== undefined &&
                previous.isPinned === body.isPinned &&
                previous.position.x === body.position.x &&
                previous.position.y === body.position.y;

            return copySimulationBody(
                keepsItsLayout
                    ? {
                          ...body,
                          position: current.position,
                          velocity: current.velocity,
                      }
                    : body,
            );
        }),
    };
}
