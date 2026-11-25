import { useLayoutEffect, useRef } from 'react';

import type { CanvasCircle } from '../canvas/math/geometry';

// RF-02: the editor grows out of the note it opens. The origin is the
// note's circle in client coordinates; the element starts clipped to that
// circle and the stylesheet widens the clip until it covers the element.
export function useExpansionOrigin<Element extends HTMLElement>(
    origin: CanvasCircle | null,
) {
    const element = useRef<Element>(null);
    // Only the opening expands; later renders keep the origin it opened from.
    const openingOrigin = useRef(origin);

    useLayoutEffect(() => {
        const node = element.current;
        const opening = openingOrigin.current;

        if (!node || !opening) {
            return;
        }

        const box = node.getBoundingClientRect();
        const x = opening.center.x - box.left;
        const y = opening.center.y - box.top;
        const reach = Math.max(
            ...[
                [0, 0],
                [box.width, 0],
                [0, box.height],
                [box.width, box.height],
            ].map(([cornerX, cornerY]) => Math.hypot(cornerX - x, cornerY - y)),
        );

        node.style.setProperty('--cvc-expansion-x', `${x}px`);
        node.style.setProperty('--cvc-expansion-y', `${y}px`);
        node.style.setProperty('--cvc-expansion-radius', `${opening.radius}px`);
        node.style.setProperty('--cvc-expansion-reach', `${reach}px`);
        node.dataset.expansion = 'note';
    }, []);

    return element;
}
