import type { CanvasPoint } from './math/geometry';
import type { RelationSummary } from '../relations/types';

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ExternalConnection = {
    relationId: string;
    targetId: string;
    title: string;
    corner: Corner;
};

export type CornerGroup = {
    corner: Corner;
    shown: ExternalConnection[];
    hidden: ExternalConnection[];
};

// D-10: a corner shows at most three indications; the rest sit behind "+N".
export const shownPerCorner = 3;
export const corners: Corner[] = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
];

// The corner a direction points to, screen y growing downwards.
export function cornerFor(direction: CanvasPoint): Corner {
    const vertical = direction.y < 0 ? 'top' : 'bottom';
    const horizontal = direction.x < 0 ? 'left' : 'right';

    return `${vertical}-${horizontal}`;
}

/**
 * RF-09: relations from a note of the open space to a note outside it. The
 * note outside has no place on this canvas, so the indication goes to the
 * corner the inside note points to from the middle of the space: the link
 * leaves the space on that side.
 */
export function findExternalConnections(
    insideNotes: ReadonlyMap<string, CanvasPoint>,
    spaceCenter: CanvasPoint,
    relations: readonly RelationSummary[],
): ExternalConnection[] {
    return relations.flatMap((relation) => {
        const sourceInside = insideNotes.get(relation.sourceEntityId);
        const targetInside = insideNotes.get(relation.targetEntityId);

        if (Boolean(sourceInside) === Boolean(targetInside)) {
            return [];
        }

        const from = (sourceInside ?? targetInside) as CanvasPoint;
        const outside = sourceInside
            ? { id: relation.targetEntityId, title: relation.targetTitle }
            : { id: relation.sourceEntityId, title: relation.sourceTitle };

        return [
            {
                relationId: relation.id,
                targetId: outside.id,
                title: outside.title ?? 'Sem título',
                corner: cornerFor({
                    x: from.x - spaceCenter.x,
                    y: from.y - spaceCenter.y,
                }),
            },
        ];
    });
}

export function groupByCorner(
    connections: readonly ExternalConnection[],
): CornerGroup[] {
    return corners.flatMap((corner) => {
        const inCorner = connections.filter(
            (connection) => connection.corner === corner,
        );

        return inCorner.length === 0
            ? []
            : [
                  {
                      corner,
                      shown: inCorner.slice(0, shownPerCorner),
                      hidden: inCorner.slice(shownPerCorner),
                  },
              ];
    });
}

/**
 * D-10 travel: up to the nearest common ancestor of where the canvas is and
 * where the target sits, then down to the target's space. Between universes
 * the common place is the galaxy view, the vault root (null).
 */
export function travelThroughCommonAncestor(
    trail: readonly string[],
    targetPath: readonly string[],
): (string | null)[] {
    let shared = 0;

    while (
        shared < trail.length &&
        shared < targetPath.length &&
        trail[shared] === targetPath[shared]
    ) {
        shared++;
    }

    const ancestor = shared === 0 ? null : trail[shared - 1];
    const down = targetPath.slice(shared);
    const steps: (string | null)[] = [];

    if (trail.length > shared) {
        steps.push(ancestor);
    }

    return [...steps, ...down];
}
