import { requireFinite, requireNonNegativeFinite } from './validate-measure';

export type CanvasPoint = { x: number; y: number };
export type CanvasViewport = CanvasPoint & { zoom: number };
export type ViewportSize = { width: number; height: number };

export const canvasUnitsPerLogicalUnit = 1024;

export function radiusForArea(area: number): number {
    requireNonNegativeFinite(area, 'Note area');

    return Math.sqrt(area / Math.PI);
}

export function toLogicalPoint(point: CanvasPoint): CanvasPoint {
    requireFinite(point.x, 'Canvas x');
    requireFinite(point.y, 'Canvas y');

    return {
        x: point.x / canvasUnitsPerLogicalUnit,
        y: point.y / canvasUnitsPerLogicalUnit,
    };
}

export function toCanvasPoint(point: CanvasPoint): CanvasPoint {
    const x = point.x * canvasUnitsPerLogicalUnit;
    const y = point.y * canvasUnitsPerLogicalUnit;
    requireFinite(x, 'Canvas x');
    requireFinite(y, 'Canvas y');

    return { x, y };
}

// Canvas point under a point of the screen, the latter measured from the
// top-left corner of the canvas element.
export function screenToCanvasPoint(
    viewport: CanvasViewport,
    point: CanvasPoint,
): CanvasPoint {
    if (!(viewport.zoom > 0)) {
        throw new RangeError('Viewport zoom must be positive.');
    }

    const x = (point.x - viewport.x) / viewport.zoom;
    const y = (point.y - viewport.y) / viewport.zoom;
    requireFinite(x, 'Canvas x');
    requireFinite(y, 'Canvas y');

    return { x, y };
}

export type CanvasCircle = { center: CanvasPoint; radius: number };
export type ViewportFit = { minZoom: number; maxZoom: number; margin: number };

// Viewport that shows every circle with a margin around them, the margin
// being a fraction of the smaller side of the screen. Null when there is
// nothing to frame or the screen has no size yet.
export function frameCircles(
    circles: readonly CanvasCircle[],
    size: ViewportSize,
    { minZoom, maxZoom, margin }: ViewportFit,
): CanvasViewport | null {
    if (circles.length === 0 || size.width <= 0 || size.height <= 0) {
        return null;
    }

    const left = Math.min(...circles.map((c) => c.center.x - c.radius));
    const right = Math.max(...circles.map((c) => c.center.x + c.radius));
    const top = Math.min(...circles.map((c) => c.center.y - c.radius));
    const bottom = Math.max(...circles.map((c) => c.center.y + c.radius));
    const free = 1 - 2 * margin;
    const zoom = Math.min(
        maxZoom,
        Math.max(
            minZoom,
            Math.min(
                (size.width * free) / (right - left),
                (size.height * free) / (bottom - top),
            ),
        ),
    );
    requireFinite(zoom, 'Viewport zoom');

    return {
        x: size.width / 2 - ((left + right) / 2) * zoom,
        y: size.height / 2 - ((top + bottom) / 2) * zoom,
        zoom,
    };
}

// Smallest circle centred on the bounding box of the circles that still
// contains all of them. Null when there are no circles.
export function enclosingCircle(
    circles: readonly CanvasCircle[],
): CanvasCircle | null {
    if (circles.length === 0) {
        return null;
    }

    const left = Math.min(...circles.map((c) => c.center.x - c.radius));
    const right = Math.max(...circles.map((c) => c.center.x + c.radius));
    const top = Math.min(...circles.map((c) => c.center.y - c.radius));
    const bottom = Math.max(...circles.map((c) => c.center.y + c.radius));
    const center = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const radius = Math.max(
        ...circles.map(
            (c) =>
                Math.hypot(c.center.x - center.x, c.center.y - center.y) +
                c.radius,
        ),
    );
    requireFinite(radius, 'Enclosing radius');

    return { center, radius };
}

// Where a circle of the canvas lands on the screen, measured from the
// top-left corner of the canvas element.
export function circleOnScreen(
    viewport: CanvasViewport,
    circle: CanvasCircle,
): CanvasCircle {
    return {
        center: {
            x: viewport.x + circle.center.x * viewport.zoom,
            y: viewport.y + circle.center.y * viewport.zoom,
        },
        radius: circle.radius * viewport.zoom,
    };
}

// Viewport that draws a circle of the canvas exactly over a circle of the
// screen, zoom kept within the limits given.
export function viewportPlacingCircle(
    canvasCircle: CanvasCircle,
    screenCircle: CanvasCircle,
    { minZoom, maxZoom }: Pick<ViewportFit, 'minZoom' | 'maxZoom'>,
): CanvasViewport {
    if (!(canvasCircle.radius > 0) || !(screenCircle.radius > 0)) {
        throw new RangeError('Circle radii must be positive.');
    }

    const zoom = Math.min(
        maxZoom,
        Math.max(minZoom, screenCircle.radius / canvasCircle.radius),
    );
    const x = screenCircle.center.x - canvasCircle.center.x * zoom;
    const y = screenCircle.center.y - canvasCircle.center.y * zoom;
    requireFinite(x, 'Viewport x');
    requireFinite(y, 'Viewport y');
    requireFinite(zoom, 'Viewport zoom');

    return { x, y, zoom };
}

export function preserveViewportCenter(
    viewport: CanvasViewport,
    previous: ViewportSize,
    next: ViewportSize,
): CanvasViewport {
    requireFinite(viewport.x, 'Viewport x');
    requireFinite(viewport.y, 'Viewport y');

    if (
        ![
            viewport.zoom,
            previous.width,
            previous.height,
            next.width,
            next.height,
        ].every((value) => Number.isFinite(value) && value > 0)
    ) {
        throw new RangeError(
            'Viewport zoom and dimensions must be positive and finite.',
        );
    }

    const x = viewport.x + (next.width - previous.width) / 2;
    const y = viewport.y + (next.height - previous.height) / 2;
    requireFinite(x, 'Viewport x');
    requireFinite(y, 'Viewport y');

    return { x, y, zoom: viewport.zoom };
}
