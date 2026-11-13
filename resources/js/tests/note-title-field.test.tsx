import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NoteTitleField } from '../documents/note-title-field';

function renderField(title: string | null = 'Planeta') {
    const onRename = vi.fn<(title: string) => Promise<void>>(() =>
        Promise.resolve(),
    );
    render(<NoteTitleField title={title} onRename={onRename} />);

    return { onRename, input: screen.getByLabelText('Nome da nota') };
}

describe('RF-02 note title edited in the editor', () => {
    it('saves the trimmed title when the field is left', async () => {
        const { onRename, input } = renderField();

        fireEvent.change(input, { target: { value: '  Planeta vermelho ' } });
        fireEvent.blur(input);

        await waitFor(() =>
            expect(onRename).toHaveBeenCalledWith('Planeta vermelho'),
        );
    });

    it('saves on Enter and does not send an unchanged title', async () => {
        const { onRename, input } = renderField();

        fireEvent.keyDown(input, { key: 'Enter' });
        fireEvent.blur(input);

        await waitFor(() => expect(onRename).not.toHaveBeenCalled());
    });

    it('puts the saved title back on Escape', () => {
        const { input } = renderField();

        fireEvent.change(input, { target: { value: 'Outro nome' } });
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(input).toHaveValue('Planeta');
    });

    it('refuses an empty title instead of sending it', async () => {
        const { onRename, input } = renderField();

        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.blur(input);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Dê um nome à nota.',
        );
        expect(onRename).not.toHaveBeenCalled();
    });

    it('shows why a rename failed', async () => {
        const onRename = vi.fn(() =>
            Promise.reject(new Error('The title field is required.')),
        );
        render(<NoteTitleField title={null} onRename={onRename} />);
        const input = screen.getByLabelText('Nome da nota');

        fireEvent.change(input, { target: { value: 'Nova' } });
        fireEvent.blur(input);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'The title field is required.',
        );
    });
});
