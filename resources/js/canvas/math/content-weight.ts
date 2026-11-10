import { countTopLevelMarkdownBlocks } from './markdown-blocks';
import { requireCount, requireNonNegativeFinite } from './validate-measure';

const characters = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const letterOrNumber = /^[\p{L}\p{N}]\p{M}*$/u;
const emojiCharacter =
    /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u;

export type OwnContentMeasure = {
    text: string;
    markdownBlockCount: number;
    flowchartNodeCount: number;
    flowchartEdgeCount: number;
};

export function measureTextWeight(text: string): number {
    const normalizedText = text.replace(/\r\n?/g, '\n').normalize('NFC');
    let weightUnits = 0;

    for (const { segment } of characters.segment(normalizedText)) {
        weightUnits +=
            !emojiCharacter.test(segment) && letterOrNumber.test(segment)
                ? 5
                : 2;
    }

    return weightUnits / 5;
}

export function measureNormalNoteContent(markdown: string): number {
    return measureOwnContent({
        text: markdown,
        markdownBlockCount: countTopLevelMarkdownBlocks(markdown),
        flowchartNodeCount: 0,
        flowchartEdgeCount: 0,
    });
}

export function measureOwnContent(measure: OwnContentMeasure): number {
    requireCount(measure.markdownBlockCount, 'Markdown block count');
    requireCount(measure.flowchartNodeCount, 'Flowchart node count');
    requireCount(measure.flowchartEdgeCount, 'Flowchart edge count');
    const content =
        measureTextWeight(measure.text) +
        0.8 * measure.markdownBlockCount +
        0.8 * measure.flowchartNodeCount +
        0.4 * measure.flowchartEdgeCount;
    requireNonNegativeFinite(content, 'Own content');

    return content;
}
