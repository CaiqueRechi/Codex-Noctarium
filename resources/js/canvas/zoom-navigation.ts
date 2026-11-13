import {
    circleOnScreen,
    enclosingCircle,
} from './math/geometry';
import type {
    CanvasCircle,
    CanvasViewport,
    ViewportSize,
} from './math/geometry';

// D-12: a space is entered when its circle covers 60% of the smaller side of
// the screen, and left when the open space shrinks to 30%. The gap between
// the two keeps a still camera from switching levels back and forth.
export const enterSpaceShare = 0.6;
export const leaveSpaceShare = 0.3;

// A context is entered by its id; a note, through the space of its subnotes.
export type SpaceEntry =
    | { kind: 'context'; contextId: string }
    | { kind: 'note'; entityId: string };

export type EnterableCircle = CanvasCircle & { entry: SpaceEntry };

// `circle` is in canvas units: the circle entered, or the open space being
// left. Keeping it, rather than where it was on screen, lets the next space
// be placed where that circle is when the next space arrives, even if the
// camera kept moving in between.
export type ZoomNavigation =
    | { kind: 'enter'; entry: SpaceEntry; circle: CanvasCircle }
    | { kind: 'leave'; circle: CanvasCircle };

export type ZoomNavigationInput = {
    viewport: CanvasViewport;
    size: ViewportSize;
    enterable: readonly EnterableCircle[];
    spaceCircles: readonly CanvasCircle[];
    canLeave: boolean;
};

export function decideZoomNavigation({
    viewport,
    size,
    enterable,
    spaceCircles,
    canLeave,
}: ZoomNavigationInput): ZoomNavigation | null {
    const shortSide = Math.min(size.width, size.height);

    if (!(shortSide > 0) || !(viewport.zoom > 0)) {
        return null;
    }

    const entered = circleToEnter(viewport, size, enterable, shortSide);

    if (entered) {
        return entered;
    }

    return canLeave ? leavingCircle(viewport, spaceCircles, shortSide) : null;
}

// The circle under the middle of the screen is the one being zoomed into;
// a large circle off to the side is not.
function circleToEnter(
    viewport: CanvasViewport,
    size: ViewportSize,
    enterable: readonly EnterableCircle[],
    shortSide: number,
): ZoomNavigation | null {
    const middle = { x: size.width / 2, y: size.height / 2 };
    const candidates = enterable
        .map((circle) => ({
            circle,
            screenCircle: circleOnScreen(viewport, circle),
        }))
        .filter(
            ({ screenCircle }) =>
                2 * screenCircle.radius >= enterSpaceShare * shortSide &&
                distance(screenCircle.center, middle) <= screenCircle.radius,
        )
        .sort(
            (a, b) =>
                distance(a.screenCircle.center, middle) -
                distance(b.screenCircle.center, middle),
        );
    const chosen = candidates[0];

    if (!chosen) {
        return null;
    }

    const { entry, center, radius } = chosen.circle;

    return { kind: 'enter', entry, circle: { center, radius } };
}

function leavingCircle(
    viewport: CanvasViewport,
    spaceCircles: readonly CanvasCircle[],
    shortSide: number,
): ZoomNavigation | null {
    const space = enclosingCircle(spaceCircles);

    if (!space) {
        return null;
    }

    const screenCircle = circleOnScreen(viewport, space);

    return 2 * screenCircle.radius <= leaveSpaceShare * shortSide
        ? { kind: 'leave', circle: space }
        : null;
}

function distance(
    a: { x: number; y: number },
    b: { x: number; y: number },
): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
