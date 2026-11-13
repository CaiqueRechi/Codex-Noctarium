import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// D-12: on a phone a press held this long, without sliding, opens what a
// right click or a modifier key does on a desktop.
export const longPressDelay = 500;
export const longPressTolerance = 10;

export type LongPressPoint = { clientX: number; clientY: number };

type Pending = { timer: number; x: number; y: number };

// Only touch counts: a mouse already has the double click and Ctrl.
export function useLongPress(
    onLongPress: (target: Element, point: LongPressPoint) => void,
) {
    const pending = useRef<Pending | null>(null);

    const cancel = useCallback(() => {
        if (pending.current) {
            window.clearTimeout(pending.current.timer);
            pending.current = null;
        }
    }, []);

    useEffect(() => cancel, [cancel]);

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            cancel();

            if (
                event.pointerType !== 'touch' ||
                !event.isPrimary ||
                !(event.target instanceof Element)
            ) {
                return;
            }

            const target = event.target;
            const point = { clientX: event.clientX, clientY: event.clientY };
            pending.current = {
                x: point.clientX,
                y: point.clientY,
                timer: window.setTimeout(() => {
                    pending.current = null;
                    onLongPress(target, point);
                }, longPressDelay),
            };
        },
        [cancel, onLongPress],
    );

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            const start = pending.current;

            if (
                start &&
                Math.hypot(event.clientX - start.x, event.clientY - start.y) >
                    longPressTolerance
            ) {
                cancel();
            }
        },
        [cancel],
    );

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp: cancel,
        onPointerCancel: cancel,
    };
}
