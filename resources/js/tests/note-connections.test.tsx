import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    connectionsOf,
    NoteConnections,
} from '../documents/note-connections';
import type { RelationSummary } from '../relations/types';

function relation(
    id: string,
    source: [string, string],
    target: [string, string],
): RelationSummary {
    return {
        id,
        sourceEntityId: source[0],
        sourceTitle: source[1],
        targetEntityId: target[0],
        targetTitle: target[1],
        contextId: null,
        relationType: null,
        isDirected: false,
        properties: {},
    };
}

const relations = [
    relation('r1', ['note', 'Nota'], ['a', 'Alfa']),
    relation('r2', ['b', 'Beta'], ['note', 'Nota']),
    relation('r3', ['a', 'Alfa'], ['b', 'Beta']),
];

describe('D-12 connections listed in the editor', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                targets: [
                    { id: 'p', title: 'Planeta', path: ['Universo'], score: 0 },
                ],
            }),
        });
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('takes the other end of each relation of the note, whichever side it is on', () => {
        expect(connectionsOf('note', relations)).toEqual([
            { relationId: 'r1', title: 'Alfa' },
            { relationId: 'r2', title: 'Beta' },
        ]);
    });

    it('lists the connections and removes the chosen one', async () => {
        const onRemove = vi.fn(() => Promise.resolve());
        render(
            <NoteConnections
                noteId="note"
                relations={relations}
                targetsEndpoint="/vault/link-targets"
                onLink={vi.fn()}
                onRemove={onRemove}
            />,
        );

        expect(screen.getByText('Alfa')).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole('button', { name: 'Remover conexão com Beta' }),
        );

        await waitFor(() => expect(onRemove).toHaveBeenCalledWith('r2'));
    });

    it('invites to connect when there is nothing yet', () => {
        render(
            <NoteConnections
                noteId="alone"
                relations={relations}
                targetsEndpoint="/vault/link-targets"
                onLink={vi.fn()}
                onRemove={vi.fn()}
            />,
        );

        expect(screen.getByText(/Ligue esta nota a outra/)).toBeInTheDocument();
    });

    it('connects to a note found by the start of its title', async () => {
        const onLink = vi.fn(() => Promise.resolve());
        render(
            <NoteConnections
                noteId="note"
                relations={relations}
                targetsEndpoint="/vault/link-targets"
                onLink={onLink}
                onRemove={vi.fn()}
            />,
        );
        const field = screen.getByRole('combobox', { name: 'Conectar a…' });

        fireEvent.change(field, { target: { value: 'pla' } });
        const option = await screen.findByRole('option', { name: /Planeta/ });

        expect(fetchMock.mock.calls[0][0]).toBe(
            '/vault/link-targets?prefix=pla&except=note',
        );
        fireEvent.mouseDown(option);

        await waitFor(() => expect(onLink).toHaveBeenCalledWith('p'));
        await waitFor(() => expect(field).toHaveValue(''));
    });
});
