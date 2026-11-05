import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OperationalStatusPanel } from '../operations/operational-status-panel';

describe('RF-13 operational status', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('shows save and queue failures until an authorized refresh confirms completion', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                tasks: [
                    {
                        id: 'operation-1',
                        type: 'search_index',
                        status: 'succeeded',
                        progressCurrent: 1,
                        progressTotal: 1,
                        message: 'Índice de busca atualizado.',
                        errorCode: null,
                        createdAt: '2026-11-05T12:00:00+00:00',
                        finishedAt: '2026-11-05T12:00:01+00:00',
                    },
                ],
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <OperationalStatusPanel
                endpoint="/vault/operations"
                saveState="failed"
                initialTasks={[
                    {
                        id: 'operation-1',
                        type: 'search_index',
                        status: 'failed',
                        progressCurrent: 0,
                        progressTotal: 1,
                        message: 'Falha ao atualizar o índice.',
                        errorCode: 'search_index_failed',
                        createdAt: '2026-11-05T12:00:00+00:00',
                        finishedAt: '2026-11-05T12:00:01+00:00',
                    },
                ]}
            />,
        );

        expect(
            screen.getByText('Falha ao salvar; conteúdo mantido no editor'),
        ).toBeInTheDocument();
        expect(screen.getByText('Falhou')).toBeInTheDocument();
        expect(
            screen.getByText('Falha ao atualizar o índice.'),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));

        await waitFor(() =>
            expect(screen.getByText('Concluída')).toBeInTheDocument(),
        );
        expect(fetchMock).toHaveBeenCalledWith('/vault/operations', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        });
    });
});
