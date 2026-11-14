import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchResult } from '../search/api';
import { groupCompassResults, isNearResult } from '../search/compass-groups';
import { CompassSearch } from '../search/compass-search';

function result(
    id: string,
    contextId: string,
    path: [string, string][],
): SearchResult {
    return {
        id,
        contextId,
        path: path.map(([pathId, name]) => ({ id: pathId, name })),
        title: id,
        snippet: '',
        entityType: null,
        tags: [],
    };
}

const local = result('Lua', 'c1', [['u1', 'Meu Universo'], ['c1', 'Céu']]);
const remote = result('Marte', 'c2', [['u2', 'Outro'], ['c2', 'Planetas']]);

describe('RF-07 compass groups (D-11)', () => {
    it('splits the results between this universe and the others', () => {
        expect(groupCompassResults([local, remote], 'u1')).toEqual({
            kind: 'split',
            here: [local],
            elsewhere: [remote],
        });
    });

    it('keeps one list at the galaxy view, where no universe is open', () => {
        expect(groupCompassResults([local, remote], null)).toEqual({
            kind: 'single',
            results: [local, remote],
        });
    });

    it('calls near only a result in the space open now', () => {
        expect(isNearResult(local, 'c1')).toBe(true);
        expect(isNearResult(local, 'u1')).toBe(false);
        expect(isNearResult(local, null)).toBe(false);
    });
});

describe('RF-07 compass search panel', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ results: [local, remote] }),
            }),
        );
    });

    afterEach(() => vi.unstubAllGlobals());

    function renderCompass(props: Partial<Parameters<typeof CompassSearch>[0]> = {}) {
        const onChoose = vi.fn();
        const onReturn = vi.fn();
        render(
            <CompassSearch
                endpoint="/vault/search"
                currentUniverseId="u1"
                canReturn={false}
                onChoose={onChoose}
                onReturn={onReturn}
                {...props}
            />,
        );

        return { onChoose, onReturn };
    }

    it('opens from the compass and shows both groups', async () => {
        renderCompass();

        fireEvent.click(screen.getByRole('button', { name: 'Pesquisar no vault' }));
        fireEvent.change(screen.getByLabelText('Pesquisar no vault'), {
            target: { value: 'lu' },
        });

        expect(
            await screen.findByRole('region', { name: 'Neste universo' }),
        ).toHaveTextContent('Lua');
        expect(
            screen.getByRole('region', { name: 'Outros universos' }),
        ).toHaveTextContent('Outro → Planetas');
    });

    it('closes the panel and hands the chosen result over', async () => {
        const { onChoose } = renderCompass();

        fireEvent.click(screen.getByRole('button', { name: 'Pesquisar no vault' }));
        fireEvent.change(screen.getByLabelText('Pesquisar no vault'), {
            target: { value: 'ma' },
        });
        fireEvent.click(await screen.findByRole('button', { name: /Marte/ }));

        expect(onChoose).toHaveBeenCalledWith(remote);
        expect(screen.getByRole('complementary', { hidden: true })).not.toBeVisible();
    });

    it('waits for two characters before searching', async () => {
        renderCompass();

        fireEvent.click(screen.getByRole('button', { name: 'Pesquisar no vault' }));
        fireEvent.change(
            screen.getByRole('searchbox', { name: 'Pesquisar no vault' }),
            {
                target: { value: 'l' },
            },
        );

        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(fetch).not.toHaveBeenCalled();
    });

    it('offers to go back only after a result was opened', () => {
        const { onReturn } = renderCompass({ canReturn: true });

        fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

        expect(onReturn).toHaveBeenCalled();
    });
});
