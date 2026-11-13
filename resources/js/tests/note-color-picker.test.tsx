import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    NoteColorPicker,
    noteColors,
} from '../documents/note-color-picker';

describe('RF-02 note color chosen in the editor', () => {
    it('offers the tones of the theme and no color, marking the current one', () => {
        render(<NoteColorPicker color="aurora" onPaint={vi.fn()} />);

        expect(screen.getAllByRole('radio')).toHaveLength(noteColors.length + 1);
        expect(screen.getByRole('radio', { name: 'Aurora' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(screen.getByRole('radio', { name: 'Sem cor' })).toHaveAttribute(
            'aria-checked',
            'false',
        );
    });

    it('paints with the chosen tone and takes it away with no color', async () => {
        const onPaint = vi.fn(() => Promise.resolve());
        render(<NoteColorPicker color={null} onPaint={onPaint} />);

        fireEvent.click(screen.getByRole('radio', { name: 'Brasa' }));
        fireEvent.click(screen.getByRole('radio', { name: 'Sem cor' }));

        await waitFor(() => expect(onPaint).toHaveBeenCalledTimes(2));
        expect(onPaint).toHaveBeenNthCalledWith(1, 'brasa');
        expect(onPaint).toHaveBeenNthCalledWith(2, null);
    });

    it('says when the color could not be changed', async () => {
        render(
            <NoteColorPicker
                color={null}
                onPaint={() => Promise.reject(new Error('Sem permissão.'))}
            />,
        );

        fireEvent.click(screen.getByRole('radio', { name: 'Vazio' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Sem permissão.',
        );
    });
});
