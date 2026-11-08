import { describe, expect, it } from 'vitest';

import {
    measureOwnContent,
    measureTextWeight,
} from '../canvas/math/content-weight';
import { calculateHierarchicalContentWeight } from '../canvas/math/hierarchy-weight';
import type { ContentHierarchyNode } from '../canvas/math/hierarchy-weight';
import { distributeSpaceBudget } from '../canvas/math/space-budget';

describe('RF-03 approved content formulas', () => {
    it('counts letters/numbers as 1 and spaces/special characters as 0.4', () => {
        expect(measureTextWeight('Olá, ç1!')).toBe(6.2);
        expect(measureTextWeight('')).toBe(0);
        expect(measureTextWeight('\t\n ')).toBe(1.2);
    });

    it('counts Markdown source instead of stripping its syntax', () => {
        expect(measureTextWeight('**Olá**')).toBe(4.6);
        const content = measureOwnContent({
            text: '**Olá**',
            markdownBlockCount: 1,
            flowchartNodeCount: 0,
            flowchartEdgeCount: 0,
        });
        expect(content).toBeCloseTo(5.4, 12);
        expect(0.5 * content).toBeCloseTo(2.7, 12);
    });

    it('counts flowchart nodes and internal edges using their approved structural weights', () => {
        const content = measureOwnContent({
            text: '',
            markdownBlockCount: 0,
            flowchartNodeCount: 2,
            flowchartEdgeCount: 1,
        });
        expect(content).toBe(2);
        expect(0.5 * content).toBe(1);
    });

    it('normalizes composed accents and platform line endings without changing the input', () => {
        const source = 'ac\u0327a\u0303o\r\nlinha\r';
        expect(measureTextWeight(source)).toBe(
            measureTextWeight('ação\nlinha\n'),
        );
        expect(source).toContain('\r');
    });

    it.each(['👨‍👩‍👧‍👦', '🇧🇷', '1️⃣'])(
        'counts the emoji %s as one special character',
        (text) => {
            expect(measureTextWeight(text)).toBe(0.4);
        },
    );

    it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
        'rejects an invalid structural count: %s',
        (count) => {
            expect(() =>
                measureOwnContent({
                    text: '',
                    markdownBlockCount: count,
                    flowchartNodeCount: 0,
                    flowchartEdgeCount: 0,
                }),
            ).toThrow(RangeError);
            expect(() =>
                measureOwnContent({
                    text: '',
                    markdownBlockCount: 0,
                    flowchartNodeCount: count,
                    flowchartEdgeCount: 0,
                }),
            ).toThrow(RangeError);
            expect(() =>
                measureOwnContent({
                    text: '',
                    markdownBlockCount: 0,
                    flowchartNodeCount: 0,
                    flowchartEdgeCount: count,
                }),
            ).toThrow(RangeError);
        },
    );
});

describe('RF-03 D-01 descendant aggregation', () => {
    const notes = new Map<string, ContentHierarchyNode>([
        ['root', { ownContent: 10, childIds: ['left', 'right'] }],
        ['left', { ownContent: 20, childIds: ['shared'] }],
        ['right', { ownContent: 30, childIds: ['shared', 'shared'] }],
        ['shared', { ownContent: 40, childIds: [] }],
        ['outside', { ownContent: 100000, childIds: [] }],
    ]);

    it('sums each unique descendant own content once without repeatedly applying 0.8', () => {
        expect(calculateHierarchicalContentWeight('root', notes)).toEqual({
            ownContent: 10,
            descendantContent: 90,
            weight: 77,
        });
        expect(calculateHierarchicalContentWeight('left', notes).weight).toBe(
            42,
        );
        expect(calculateHierarchicalContentWeight('right', notes).weight).toBe(
            47,
        );
    });

    it('has no descendant contribution for a leaf or empty note', () => {
        expect(calculateHierarchicalContentWeight('shared', notes)).toEqual({
            ownContent: 40,
            descendantContent: 0,
            weight: 20,
        });
        expect(
            calculateHierarchicalContentWeight(
                'empty',
                new Map([['empty', { ownContent: 0, childIds: [] }]]),
            ),
        ).toEqual({ ownContent: 0, descendantContent: 0, weight: 0 });
    });

    it('uses the latest source snapshot instead of retaining a stale cross-space cache', () => {
        const changed = new Map(notes);
        changed.set('shared', { ownContent: 50, childIds: [] });
        expect(calculateHierarchicalContentWeight('root', changed).weight).toBe(
            85,
        );
        expect(calculateHierarchicalContentWeight('root', notes).weight).toBe(
            77,
        );
    });

    it.each([
        { entries: [['root', { ownContent: 1, childIds: ['root'] }]] },
        {
            entries: [
                ['root', { ownContent: 1, childIds: ['child'] }],
                ['child', { ownContent: 1, childIds: ['root'] }],
            ],
        },
    ] as { entries: [string, ContentHierarchyNode][] }[])(
        'rejects a cycle without modifying the hierarchy',
        ({ entries }) => {
            const graph = new Map(entries);
            expect(() =>
                calculateHierarchicalContentWeight('root', graph),
            ).toThrow('cycle');
            expect([...graph]).toEqual(entries);
        },
    );

    it('rejects missing roots and dangling child references', () => {
        expect(() =>
            calculateHierarchicalContentWeight('missing', notes),
        ).toThrow('missing');
        expect(() =>
            calculateHierarchicalContentWeight(
                'root',
                new Map([['root', { ownContent: 1, childIds: ['missing'] }]]),
            ),
        ).toThrow('missing');
    });

    it.each([-1, Infinity, NaN])(
        'rejects invalid own content instead of producing invalid weights: %s',
        (ownContent) => {
            expect(() =>
                calculateHierarchicalContentWeight(
                    'root',
                    new Map([['root', { ownContent, childIds: [] }]]),
                ),
            ).toThrow(RangeError);
        },
    );

    it('walks deep hierarchies without recursive stack overflow', () => {
        const graph = new Map<string, ContentHierarchyNode>();

        for (let index = 0; index < 10000; index++) {
            graph.set(String(index), {
                ownContent: 1,
                childIds: index === 9999 ? [] : [String(index + 1)],
            });
        }

        expect(calculateHierarchicalContentWeight('0', graph).weight).toBe(
            0.5 + 0.8 * 9999,
        );
    });

    it('fails closed if valid individual content values overflow their aggregate', () => {
        expect(() =>
            calculateHierarchicalContentWeight(
                'root',
                new Map([
                    ['root', { ownContent: 1, childIds: ['a', 'b'] }],
                    ['a', { ownContent: Number.MAX_VALUE, childIds: [] }],
                    ['b', { ownContent: Number.MAX_VALUE, childIds: [] }],
                ]),
            ),
        ).toThrow(RangeError);
    });
});

describe('RF-03 D-02 fixed spatial budget', () => {
    it('reserves all space when no children exist', () => {
        expect(distributeSpaceBudget([])).toEqual({
            totalArea: 1,
            emptyArea: 1,
            allocations: [],
        });
    });

    it('uses empty weight 2 and a minimum child weight 1', () => {
        const result = distributeSpaceBudget([{ id: 'empty', weight: 0 }]);
        expect(result.emptyArea).toBeCloseTo(2 / 3, 12);
        expect(result.allocations[0]).toMatchObject({ id: 'empty', weight: 1 });
        expect(result.allocations[0].area).toBeCloseTo(1 / 3, 12);
    });

    it('reserves at least 20 percent and allocates remaining space proportionally', () => {
        const result = distributeSpaceBudget([
            { id: 'small', weight: 10 },
            { id: 'large', weight: 30 },
        ]);
        expect(result.emptyArea).toBe(0.2);
        expect(result.allocations[0].area).toBeCloseTo(0.2, 12);
        expect(result.allocations[1].area).toBeCloseTo(0.6, 12);
    });

    it('redistributes the same budget when adding or removing notes', () => {
        const notes = [{ id: 'one', weight: 10 }];
        const initial = distributeSpaceBudget(notes);
        const expanded = distributeSpaceBudget([
            ...notes,
            { id: 'two', weight: 10 },
        ]);
        expect(expanded.allocations[0].area).toBeLessThan(
            initial.allocations[0].area,
        );
        expect(expanded.totalArea).toBe(initial.totalArea);
        expect(distributeSpaceBudget(notes)).toEqual(initial);
        expect(notes).toEqual([{ id: 'one', weight: 10 }]);
    });

    it('conserves X within 1e-12 for 1000 child allocations', () => {
        const result = distributeSpaceBudget(
            Array.from({ length: 1000 }, (_, index) => ({
                id: String(index),
                weight: index / 3,
            })),
        );
        const sum = result.allocations.reduce(
            (total, note) => total + note.area,
            result.emptyArea,
        );
        expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
        expect(
            result.allocations.every(
                (note) => Number.isFinite(note.area) && note.area > 0,
            ),
        ).toBe(true);
    });

    it('rejects duplicate allocations and non-finite sums', () => {
        expect(() =>
            distributeSpaceBudget([
                { id: 'one', weight: 1 },
                { id: 'one', weight: 2 },
            ]),
        ).toThrow('one allocation');
        expect(() =>
            distributeSpaceBudget([
                { id: 'one', weight: Number.MAX_VALUE },
                { id: 'two', weight: Number.MAX_VALUE },
            ]),
        ).toThrow(RangeError);
    });

    it.each([-1, NaN, Infinity])(
        'rejects an invalid note weight: %s',
        (weight) => {
            expect(() =>
                distributeSpaceBudget([{ id: 'one', weight }]),
            ).toThrow(RangeError);
        },
    );
});
