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
