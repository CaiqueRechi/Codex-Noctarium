import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CanvasCircle } from '../canvas/math/geometry';
import { useExpansionOrigin } from '../documents/use-expansion-origin';

function Panel({ origin }: { origin: CanvasCircle | null }) {
    const element = useExpansionOrigin<HTMLDivElement>(origin);

    return <div ref={element} data-testid="panel" />;
}

describe('RF-02 editor growing out of the note', () => {
    afterEach(() => vi.restoreAllMocks());

    it('starts at the note circle and reaches the farthest corner of the editor', () => {
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect',
        ).mockReturnValue(
            DOMRect.fromRect({ x: 40, y: 20, width: 300, height: 400 }),
        );

        render(<Panel origin={{ center: { x: 70, y: 60 }, radius: 12 }} />);

        const panel = screen.getByTestId('panel');

        expect(panel).toHaveAttribute('data-expansion', 'note');
        expect(panel.style.getPropertyValue('--expansion-x')).toBe('30px');
        expect(panel.style.getPropertyValue('--expansion-y')).toBe('40px');
        expect(panel.style.getPropertyValue('--expansion-radius')).toBe('12px');
        expect(
            Number.parseFloat(
                panel.style.getPropertyValue('--expansion-reach'),
            ),
        ).toBeCloseTo(Math.hypot(300 - 30, 400 - 40), 10);
    });

    it('keeps the origin it opened from when the note moves later', () => {
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect',
        ).mockReturnValue(
            DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 400 }),
        );

        const { rerender } = render(
            <Panel origin={{ center: { x: 10, y: 10 }, radius: 4 }} />,
        );
        rerender(<Panel origin={{ center: { x: 200, y: 200 }, radius: 4 }} />);

        expect(
            screen.getByTestId('panel').style.getPropertyValue('--expansion-x'),
        ).toBe('10px');
    });

    it('opens without the note expansion when nothing on screen opened it', () => {
        render(<Panel origin={null} />);

        expect(screen.getByTestId('panel')).not.toHaveAttribute(
            'data-expansion',
        );
    });
});
