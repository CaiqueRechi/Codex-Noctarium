import { describe, expect, it } from 'vitest';

import {
    isFlowchartContent,
    parseFlowchart,
    serializeFlowchart,
} from '../flowchart/flowchart';
import type { Flowchart } from '../flowchart/flowchart';
import {
    convertToFlowchart,
    convertToNormalNote,
    flowchartToMermaid,
    mermaidToFlowchart,
} from '../flowchart/mermaid';

const chart: Flowchart = {
    description: 'Como salvar',
    nodes: [
        { id: 'a', kind: 'start', text: 'Início', x: 0, y: 0 },
        { id: 'b', kind: 'decision', text: 'Mudou "algo"?', x: 0, y: 140 },
        { id: 'c', kind: 'io', text: 'Salvar', x: 220, y: 140 },
        { id: 'd', kind: 'process', text: 'Esperar 1,5 s', x: 0, y: 280 },
    ],
    edges: [
        { id: 'e1', from: 'a', to: 'b', text: '' },
        { id: 'e2', from: 'b', to: 'c', text: 'Sim' },
        { id: 'e3', from: 'b', to: 'd', text: 'Não' },
    ],
};

describe('RF-04 flowchart stored in the note', () => {
    it('recognizes its own content and reads it back', () => {
        const content = serializeFlowchart(chart);

        expect(isFlowchartContent(content)).toBe(true);
        expect(isFlowchartContent('# Nota normal')).toBe(false);
        expect(isFlowchartContent('{"outra": 1}')).toBe(false);
        expect(parseFlowchart(content)).toEqual(chart);
    });
});

describe('RF-05 conversion through a mermaid block (D-07)', () => {
    it('writes the diagram as a block that rebuilds the same diagram', () => {
        const block = flowchartToMermaid(chart);
        const body = block.split('\n').slice(1, -1).join('\n');
        const rebuilt = mermaidToFlowchart(body);

        expect(block.startsWith('```mermaid\nflowchart TD')).toBe(true);
        expect(block).toContain('%% cvc-pos c 220 140');
        expect(rebuilt).toEqual({ chart: { nodes: chart.nodes, edges: chart.edges } });
    });

    it('keeps the description and the diagram as text, or the description alone', () => {
        const asText = convertToNormalNote(chart, true);

        expect(asText.startsWith('Como salvar\n\n```mermaid')).toBe(true);
        expect(convertToNormalNote(chart, false)).toBe('Como salvar');
    });

    it('rebuilds the diagram from the block left in the text, edits included, and takes the block out', () => {
        const edited = convertToNormalNote(chart, true).replace('Salvar', 'Gravar');
        const conversion = convertToFlowchart(edited);

        expect(conversion.ok).toBe(true);
        const rebuilt = parseFlowchart((conversion as { content: string }).content);
        expect(rebuilt.description).toBe('Como salvar');
        expect(rebuilt.nodes.find((node) => node.id === 'c')?.text).toBe('Gravar');
    });

    it('makes an empty diagram when there is no block, keeping the text as description', () => {
        const conversion = convertToFlowchart('Só texto');

        expect(conversion.ok).toBe(true);
        expect(parseFlowchart((conversion as { content: string }).content)).toEqual({
            description: 'Só texto',
            nodes: [],
            edges: [],
        });
    });

    it('refuses more than one block, and an invalid block, changing nothing', () => {
        const twice = `${flowchartToMermaid(chart)}\n\n${flowchartToMermaid(chart)}`;

        expect(convertToFlowchart(twice)).toEqual({
            ok: false,
            error: expect.stringContaining('mais de um bloco'),
        });
        expect(
            convertToFlowchart('```mermaid\nflowchart TD\n    a --> z\n```'),
        ).toEqual({ ok: false, error: expect.stringContaining('não existe') });
        expect(
            convertToFlowchart('```mermaid\nsequenceDiagram\n```'),
        ).toEqual({ ok: false, error: expect.stringContaining('flowchart TD') });
    });

    it('places blocks without a position comment on a grid', () => {
        const parsed = mermaidToFlowchart('flowchart TD\n    a[Um]\n    b[Dois]');

        expect('chart' in parsed && parsed.chart.nodes.map((node) => [node.x, node.y])).toEqual([
            [0, 0],
            [220, 0],
        ]);
    });
});
