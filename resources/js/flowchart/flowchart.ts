// RF-04: the diagram of a flowchart note, stored as JSON in the note's own
// document. The server (Flowchart.php) checks the same shape on save.
export const flowchartFormat = 'cvc-flowchart';

export type FlowchartKind = 'start' | 'process' | 'decision' | 'io';

export type FlowchartNode = {
    id: string;
    kind: FlowchartKind;
    text: string;
    x: number;
    y: number;
};

export type FlowchartEdge = {
    id: string;
    from: string;
    to: string;
    text: string;
};

export type Flowchart = {
    description: string;
    nodes: FlowchartNode[];
    edges: FlowchartEdge[];
};

export const flowchartKinds: { kind: FlowchartKind; label: string }[] = [
    { kind: 'start', label: 'Início/fim' },
    { kind: 'process', label: 'Processo' },
    { kind: 'decision', label: 'Decisão' },
    { kind: 'io', label: 'Entrada/saída' },
];

export function isFlowchartContent(content: string): boolean {
    if (!content.trimStart().startsWith('{')) {
        return false;
    }

    try {
        const data = JSON.parse(content) as { format?: unknown };

        return data.format === flowchartFormat;
    } catch {
        return false;
    }
}

export function parseFlowchart(content: string): Flowchart {
    const data = JSON.parse(content) as Partial<Flowchart> & {
        format?: unknown;
    };

    if (data.format !== flowchartFormat) {
        throw new Error('O conteúdo não é um fluxograma.');
    }

    return {
        description: typeof data.description === 'string' ? data.description : '',
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        edges: Array.isArray(data.edges) ? data.edges : [],
    };
}

export function serializeFlowchart(chart: Flowchart): string {
    return JSON.stringify(
        {
            format: flowchartFormat,
            version: 1,
            description: chart.description,
            nodes: chart.nodes,
            edges: chart.edges,
        },
        null,
        2,
    );
}

export function emptyFlowchart(description: string): Flowchart {
    return { description, nodes: [], edges: [] };
}

// An id no other block or arrow of the diagram uses.
export function nextId(prefix: string, taken: readonly { id: string }[]): string {
    const used = new Set(taken.map((item) => item.id));
    let index = taken.length + 1;

    while (used.has(`${prefix}${index}`)) {
        index++;
    }

    return `${prefix}${index}`;
}
