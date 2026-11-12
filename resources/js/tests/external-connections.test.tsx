import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    cornerFor,
    findExternalConnections,
    groupByCorner,
    travelThroughCommonAncestor,
} from '../canvas/external-connections';
import type { ExternalConnection } from '../canvas/external-connections';
import { ExternalConnectionsOverlay } from '../canvas/external-connections-overlay';
import type { RelationSummary } from '../relations/types';

function relation(id: string, source: string, target: string): RelationSummary {
    return {
        id,
        sourceEntityId: source,
        sourceTitle: source.toUpperCase(),
        targetEntityId: target,
        targetTitle: target.toUpperCase(),
        contextId: null,
        relationType: null,
        isDirected: false,
        properties: {},
    };
}

describe('RF-09 external connections (D-10)', () => {
    const inside = new Map([
        ['a', { x: -100, y: -50 }],
        ['b', { x: 200, y: 300 }],
    ]);

    it('keeps only relations with one end inside the open space', () => {
        const found = findExternalConnections(inside, { x: 0, y: 0 }, [
            relation('r1', 'a', 'far'),
            relation('r2', 'remote', 'b'),
            relation('r3', 'a', 'b'),
            relation('r4', 'x', 'y'),
        ]);

        expect(found).toEqual([
            { relationId: 'r1', targetId: 'far', title: 'FAR', corner: 'top-left' },
            {
                relationId: 'r2',
                targetId: 'remote',
                title: 'REMOTE',
                corner: 'bottom-right',
            },
        ]);
    });

    it('picks the corner a direction points to, y growing downwards', () => {
        expect(cornerFor({ x: -1, y: -1 })).toBe('top-left');
        expect(cornerFor({ x: 1, y: -1 })).toBe('top-right');
        expect(cornerFor({ x: -1, y: 1 })).toBe('bottom-left');
        expect(cornerFor({ x: 1, y: 1 })).toBe('bottom-right');
    });

    it('shows three per corner and keeps the rest behind +N', () => {
        const many: ExternalConnection[] = ['1', '2', '3', '4', '5'].map((id) => ({
            relationId: id,
            targetId: id,
            title: id,
            corner: 'top-right',
        }));

        const [group] = groupByCorner(many);

        expect(group.shown.map((connection) => connection.title)).toEqual([
            '1',
            '2',
            '3',
        ]);
        expect(group.hidden).toHaveLength(2);
    });

    it('travels up to the common ancestor, then down to the target', () => {
        expect(
            travelThroughCommonAncestor(['u', 'a', 'a1'], ['u', 'b', 'b1']),
        ).toEqual(['u', 'b', 'b1']);
    });

    it('passes through the galaxy view between universes', () => {
        expect(travelThroughCommonAncestor(['u1', 'a'], ['u2', 'b'])).toEqual([
            null,
            'u2',
            'b',
        ]);
    });

    it('only goes down when the target is beneath, and only up when above', () => {
        expect(travelThroughCommonAncestor(['u'], ['u', 'a', 'b'])).toEqual([
            'a',
            'b',
        ]);
        expect(travelThroughCommonAncestor(['u', 'a', 'b'], ['u'])).toEqual([
            'u',
        ]);
    });

    it('draws the indications and travels on a click', () => {
        const onTravel = vi.fn();
        const many: ExternalConnection[] = ['Um', 'Dois', 'Três', 'Quatro'].map(
            (title) => ({
                relationId: title,
                targetId: `id-${title}`,
                title,
                corner: 'bottom-left',
            }),
        );
        render(
            <ExternalConnectionsOverlay connections={many} onTravel={onTravel} />,
        );

        expect(screen.queryByRole('button', { name: 'Quatro' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '+1' }));
        fireEvent.click(screen.getByRole('button', { name: 'Quatro' }));

        expect(onTravel).toHaveBeenCalledWith('id-Quatro');
    });
});
