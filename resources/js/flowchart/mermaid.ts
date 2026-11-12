import { emptyFlowchart, serializeFlowchart } from './flowchart';
import type {
    Flowchart,
    FlowchartEdge,
    FlowchartKind,
    FlowchartNode,
} from './flowchart';

/**
 * D-07: a flowchart turned into text is a `mermaid` code block holding a
 * subset of flowchart syntax (start/end, process, decision, input/output
 * and arrows with text), plus `%% cvc-pos id x y` comments that keep the
 * manual position of each block.
 */
const blockPattern = /^```mermaid[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm;
const headerPattern = /^(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)$/;
const nodePattern =
    /^([A-Za-z0-9_-]{1,64})\s*(\(\[(.*)\]\)|\[\/(.*)\/\]|\[(.*)\]|\{(.*)\})$/;
const edgePattern =
    /^([A-Za-z0-9_-]{1,64})\s*-->\s*(?:\|(.*?)\|\s*)?([A-Za-z0-9_-]{1,64})$/;
const positionPattern =
    /^%%\s*cvc-pos\s+([A-Za-z0-9_-]{1,64})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/;

export type Conversion =
    | { ok: true; content: string }
    | { ok: false; error: string };

// Mermaid reads a quoted label literally; a quote inside it is written as
// an entity so the label can never end early.
function quote(text: string): string {
    return `"${text.replaceAll('"', '#quot;')}"`;
}

function unquote(text: string): string {
    const trimmed = text.trim();
    const inner =
        trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
            ? trimmed.slice(1, -1)
            : trimmed;

    return inner.replaceAll('#quot;', '"');
}

const shapes: Record<FlowchartKind, (text: string) => string> = {
    start: (text) => `([${quote(text)}])`,
    process: (text) => `[${quote(text)}]`,
    decision: (text) => `{${quote(text)}}`,
    io: (text) => `[/${quote(text)}/]`,
};

export function flowchartToMermaid(chart: Flowchart): string {
    const lines = ['flowchart TD'];

    chart.nodes.forEach((node) =>
        lines.push(`    ${node.id}${shapes[node.kind](node.text)}`),
    );
    chart.edges.forEach((edge) =>
        lines.push(
            edge.text
                ? `    ${edge.from} -->|${quote(edge.text)}| ${edge.to}`
                : `    ${edge.from} --> ${edge.to}`,
        ),
    );
    chart.nodes.forEach((node) =>
        lines.push(`    %% cvc-pos ${node.id} ${Math.round(node.x)} ${Math.round(node.y)}`),
    );

    return ['```mermaid', ...lines, '```'].join('\n');
}

export function mermaidToFlowchart(
    source: string,
): { chart: Omit<Flowchart, 'description'> } | { error: string } {
    const lines = source.split('\n').map((line) => line.trim());
    const nodes: FlowchartNode[] = [];
    const edges: Omit<FlowchartEdge, 'id'>[] = [];
    const positions = new Map<string, { x: number; y: number }>();
    let sawHeader = false;

    for (const [index, line] of lines.entries()) {
        const number = index + 1;

        if (line === '') {
            continue;
        }

        if (!sawHeader) {
            if (!headerPattern.test(line)) {
                return { error: `Linha ${number}: o bloco precisa começar com "flowchart TD".` };
            }

            sawHeader = true;
            continue;
        }

        const position = positionPattern.exec(line);

        if (position) {
            positions.set(position[1], { x: Number(position[2]), y: Number(position[3]) });
            continue;
        }

        if (line.startsWith('%%')) {
            continue;
        }

        const edge = edgePattern.exec(line);

        if (edge) {
            edges.push({ from: edge[1], to: edge[3], text: edge[2] ? unquote(edge[2]) : '' });
            continue;
        }

        const node = nodePattern.exec(line);

        if (node) {
            const [, id, , start, io, process, decision] = node;
            const kind: FlowchartKind =
                start !== undefined ? 'start'
                : io !== undefined ? 'io'
                : decision !== undefined ? 'decision'
                : 'process';

            if (nodes.some((existing) => existing.id === id)) {
                return { error: `Linha ${number}: o bloco "${id}" foi declarado duas vezes.` };
            }

            nodes.push({ id, kind, text: unquote(start ?? io ?? process ?? decision ?? ''), x: 0, y: 0 });
            continue;
        }

        return { error: `Linha ${number}: "${line}" não é um bloco, uma seta nem uma posição.` };
    }

    if (!sawHeader) {
        return { error: 'O bloco de fluxograma está vazio.' };
    }

    const known = new Set(nodes.map((node) => node.id));
    const missing = edges.find((edge) => !known.has(edge.from) || !known.has(edge.to));

    if (missing) {
        return { error: `A seta ${missing.from} → ${missing.to} liga um bloco que não existe.` };
    }

    return {
        chart: {
            nodes: nodes.map((node, index) => ({
                ...node,
                ...(positions.get(node.id) ?? { x: (index % 4) * 220, y: Math.floor(index / 4) * 140 }),
            })),
            edges: edges.map((edge, index) => ({ ...edge, id: `e${index + 1}` })),
        },
    };
}

/**
 * D-07, normal note to flowchart: the text becomes the description. One
 * `mermaid` block is rebuilt into the diagram and leaves the description;
 * none gives an empty diagram; more than one, or an invalid one, refuses
 * the conversion and changes nothing.
 */
export function convertToFlowchart(markdown: string): Conversion {
    const blocks = [...markdown.matchAll(blockPattern)];

    if (blocks.length > 1) {
        return { ok: false, error: 'A nota tem mais de um bloco de fluxograma. Deixe apenas um e tente de novo.' };
    }

    if (blocks.length === 0) {
        return { ok: true, content: serializeFlowchart(emptyFlowchart(markdown)) };
    }

    const [block] = blocks;
    const parsed = mermaidToFlowchart(block[1]);

    if ('error' in parsed) {
        return { ok: false, error: parsed.error };
    }

    const description = (
        markdown.slice(0, block.index) + markdown.slice((block.index ?? 0) + block[0].length)
    ).replace(/\n{3,}/g, '\n\n').trim();

    return { ok: true, content: serializeFlowchart({ description, ...parsed.chart }) };
}

/**
 * D-07, flowchart to normal note: the user chooses to keep the diagram as
 * a text block, which can later rebuild it, or to discard it. The
 * description stays either way.
 */
export function convertToNormalNote(chart: Flowchart, keepAsText: boolean): string {
    if (!keepAsText || chart.nodes.length === 0) {
        return chart.description;
    }

    return [chart.description.trimEnd(), flowchartToMermaid(chart)]
        .filter((part) => part !== '')
        .join('\n\n');
}
