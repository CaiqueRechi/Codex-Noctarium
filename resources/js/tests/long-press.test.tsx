import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    longPressDelay,
    longPressTolerance,
    useLongPress,
} from '../canvas/use-long-press';

function Surface({ onLongPress }: { onLongPress: () => void }) {
    const handlers = useLongPress(onLongPress);

    return (
        <div data-testid="surface" {...handlers}>
            <span data-testid="inside">nota</span>
        </div>
    );
}

function press(
    element: Element,
    pointerType = 'touch',
    point = { clientX: 50, clientY: 50 },
) {
    fireEvent.pointerDown(element, { pointerType, isPrimary: true, ...point });
}

describe('D-12 long press on a phone', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('fires after the finger stays down long enough, with the target and point', () => {
        const onLongPress = vi.fn();
        render(<Surface onLongPress={onLongPress} />);

        press(screen.getByTestId('inside'));
        vi.advanceTimersByTime(longPressDelay - 1);
        expect(onLongPress).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onLongPress).toHaveBeenCalledWith(
            screen.getByTestId('inside'),
            { clientX: 50, clientY: 50 },
        );
    });

    it('is cancelled by lifting the finger first', () => {
        const onLongPress = vi.fn();
        render(<Surface onLongPress={onLongPress} />);

        press(screen.getByTestId('surface'));
        fireEvent.pointerUp(screen.getByTestId('surface'));
        vi.advanceTimersByTime(longPressDelay);

        expect(onLongPress).not.toHaveBeenCalled();
    });

    it('survives a tremor but not a slide', () => {
        const onLongPress = vi.fn();
        render(<Surface onLongPress={onLongPress} />);
        const surface = screen.getByTestId('surface');

        press(surface);
        fireEvent.pointerMove(surface, {
            clientX: 50 + longPressTolerance,
            clientY: 50,
        });
        vi.advanceTimersByTime(longPressDelay);
        expect(onLongPress).toHaveBeenCalledTimes(1);

        press(surface);
        fireEvent.pointerMove(surface, {
            clientX: 50 + longPressTolerance + 1,
            clientY: 50,
        });
        vi.advanceTimersByTime(longPressDelay);
        expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('ignores a mouse, which has the double click and Ctrl', () => {
        const onLongPress = vi.fn();
        render(<Surface onLongPress={onLongPress} />);

        press(screen.getByTestId('surface'), 'mouse');
        vi.advanceTimersByTime(longPressDelay);

        expect(onLongPress).not.toHaveBeenCalled();
    });
});
