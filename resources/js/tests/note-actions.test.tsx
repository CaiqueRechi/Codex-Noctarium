import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoteActions } from '../documents/note-actions';
import type { DeletionOutcome } from '../trash/types';

const deleted: DeletionOutcome = {
    kind: 'deleted',
    deletion: {
        trashItem: { id: 'n', title: 'Nota', deletedAt: '2026-11-12T00:00:00Z' },
        deletedRelationIds: [],
    },
};

function renderActions(
    placeCount: number,
    onDelete: (withSubnotes: boolean) => Promise<DeletionOutcome>,
) {
    const onRemoveHere = vi.fn(() => Promise.resolve());
    const onMove = vi.fn(() => Promise.resolve());
    render(
        <NoteActions
            placeCount={placeCount}
            contextsEndpoint="/vault/contexts"
            currentContextId="here"
            onMove={onMove}
            onRemoveHere={onRemoveHere}
            onDelete={onDelete}
        />,
    );

    return { onRemoveHere, onMove };
}

describe('RF-08 and D-13 actions on a note', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    slice: {
                        contexts: [
                            {
                                id: 'u',
                                name: 'Universo',
                                kind: 'universe',
                                parentId: null,
                                hasChildren: false,
                                documents: [],
                                contexts: [],
                            },
                        ],
                        breadcrumbs: [],
                    },
                }),
            }),
        );
    });

    afterEach(() => vi.unstubAllGlobals());

    it('sends a note in one space straight to the trash', async () => {
        const onDelete = vi.fn(() => Promise.resolve(deleted));
        renderActions(1, onDelete);

        fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

        await waitFor(() => expect(onDelete).toHaveBeenCalledWith(false));
    });

    it('asks before taking the subnotes along, and only then deletes them', async () => {
        const onDelete = vi
            .fn<(withSubnotes: boolean) => Promise<DeletionOutcome>>()
            .mockResolvedValueOnce({ kind: 'has-subnotes', subnotes: 2 })
            .mockResolvedValueOnce(deleted);
        renderActions(1, onDelete);

        fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Excluir com as subnotas',
            }),
        );

        await waitFor(() => expect(onDelete).toHaveBeenLastCalledWith(true));
        expect(screen.queryByText(/tem 2 subnota/)).not.toBeInTheDocument();
    });

    it('offers "só daqui" for a note in several spaces', async () => {
        const onDelete = vi.fn(() => Promise.resolve(deleted));
        const { onRemoveHere } = renderActions(3, onDelete);

        fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
        expect(screen.getByText('Esta nota aparece em 3 espaços.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Só daqui' }));

        await waitFor(() => expect(onRemoveHere).toHaveBeenCalled());
        expect(onDelete).not.toHaveBeenCalled();
    });

    it('moves the note to a destination chosen in the hierarchy', async () => {
        const { onMove } = renderActions(1, vi.fn());

        fireEvent.click(screen.getByRole('button', { name: 'Mover para…' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Universo' }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'Mover para Universo' }),
        );

        await waitFor(() => expect(onMove).toHaveBeenCalledWith('u'));
    });
});
