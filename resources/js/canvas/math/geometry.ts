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
