import { describe, expect, it } from 'vitest';

import { measureNormalNoteContent } from '../canvas/math/content-weight';
import { countTopLevelMarkdownBlocks } from '../canvas/math/markdown-blocks';

describe('RF-03 top-level Markdown block count', () => {
    it('counts nothing in an empty or blank note', () => {
        expect(countTopLevelMarkdownBlocks('')).toBe(0);
        expect(countTopLevelMarkdownBlocks('\n \n\t\n')).toBe(0);
    });

    it('counts each kind of block once', () => {
        const note = [
            '# Título',
            '',
            'Um parágrafo',
            'em duas linhas.',
            '',
            '- item',
            '- outro item',
            '',
            '> citação',
            '',
            '| a | b |',
            '| - | - |',
            '| 1 | 2 |',
            '',
            '```',
            'código',
            '```',
        ].join('\n');

        expect(countTopLevelMarkdownBlocks(note)).toBe(6);
    });

    it('does not let blank lines create blocks', () => {
        expect(countTopLevelMarkdownBlocks('\n\n\nUm\n\n\n\nDois\n\n\n')).toBe(
            2,
        );
    });

    it('keeps a fenced code block whole across blank lines and Markdown-looking lines', () => {
        const note = '```ts\n# não é título\n\n- não é lista\n```\nDepois';

        expect(countTopLevelMarkdownBlocks(note)).toBe(2);
    });

    it('closes a fence only with the same character and at least the same length', () => {
        expect(
            countTopLevelMarkdownBlocks('````\n```\n~~~~\n````\nDepois'),
        ).toBe(2);
        expect(countTopLevelMarkdownBlocks('~~~\n```\n\n~~~')).toBe(1);
    });

    it('counts an unclosed fence as one block until the end of the note', () => {
        expect(countTopLevelMarkdownBlocks('Antes\n\n```\nUm\n\nDois')).toBe(2);
    });

    it('counts a list once without counting its descendants again', () => {
        const note = [
            '- pai',
            '  - filho',
            '    - neto',
            '',
            '- irmão',
            '',
            '  parágrafo dentro do item',
            '',
            '  > citação dentro do item',
        ].join('\n');

        expect(countTopLevelMarkdownBlocks(note)).toBe(1);
    });

    it('ends a list at a blank line followed by text outside the item', () => {
        expect(countTopLevelMarkdownBlocks('- item\n\nParágrafo')).toBe(2);
        expect(countTopLevelMarkdownBlocks('- item\ncontinuação do item')).toBe(
            1,
        );
    });

    it('starts a new list when the marker type changes', () => {
        expect(countTopLevelMarkdownBlocks('- a\n- b\n+ c')).toBe(2);
        expect(countTopLevelMarkdownBlocks('1. a\n2. b\n1) c')).toBe(2);
        expect(countTopLevelMarkdownBlocks('1. a\n\n2. b')).toBe(1);
    });

    it('lets only a bullet or a list starting at 1 interrupt a paragraph', () => {
        expect(countTopLevelMarkdownBlocks('Texto\n- item')).toBe(2);
        expect(countTopLevelMarkdownBlocks('Texto\n1. item')).toBe(2);
        expect(countTopLevelMarkdownBlocks('Em 2026\n2026. foi assim')).toBe(1);
        expect(countTopLevelMarkdownBlocks('Texto\n-')).toBe(1);
    });

    it('counts headings in both syntaxes without splitting a setext heading', () => {
        expect(countTopLevelMarkdownBlocks('# Um\n## Dois\n#SemEspaço')).toBe(
            3,
        );
        expect(countTopLevelMarkdownBlocks('Título\n===\nTexto')).toBe(2);
        expect(countTopLevelMarkdownBlocks('Título\n---\nTexto')).toBe(2);
    });

    it('counts a thematic break as its own block, not as a list', () => {
        expect(countTopLevelMarkdownBlocks('Texto\n\n---\n\nTexto')).toBe(3);
        expect(countTopLevelMarkdownBlocks('* * *')).toBe(1);
        expect(countTopLevelMarkdownBlocks('- a\n---')).toBe(2);
    });

    it('keeps a quote together until a blank line, including lazy continuation', () => {
        expect(
            countTopLevelMarkdownBlocks('> a\n> # b\n> - c\nainda citação'),
        ).toBe(1);
        expect(countTopLevelMarkdownBlocks('> a\n\n> b')).toBe(2);
    });

    it('counts indented code once across blank lines and never inside a paragraph', () => {
        expect(countTopLevelMarkdownBlocks('    um\n\n    dois\n\nTexto')).toBe(
            2,
        );
        expect(countTopLevelMarkdownBlocks('\tcódigo')).toBe(1);
        expect(
            countTopLevelMarkdownBlocks('Texto\n    continua o parágrafo'),
        ).toBe(1);
    });

    it('produces the same count for line endings of different systems', () => {
        const unix = '# A\n\nB\n\n- c\n';

        expect(countTopLevelMarkdownBlocks(unix.replaceAll('\n', '\r\n'))).toBe(
            3,
        );
        expect(countTopLevelMarkdownBlocks(unix.replaceAll('\n', '\r'))).toBe(
            3,
        );
        expect(countTopLevelMarkdownBlocks(unix)).toBe(3);
    });

    it('counts a large note without recursion or super-linear work', () => {
        const paragraphs = Array.from(
            { length: 20000 },
            (_, index) => `p${index}`,
        );
        const hostileLine = `${'- '.repeat(20000)}x`;

        expect(countTopLevelMarkdownBlocks(paragraphs.join('\n\n'))).toBe(
            20000,
        );
        expect(countTopLevelMarkdownBlocks(hostileLine)).toBe(1);
    });
});

describe('RF-03 own content of a normal note', () => {
    it('matches the approved example for a single paragraph', () => {
        const content = measureNormalNoteContent('**Olá**');

        expect(content).toBeCloseTo(5.4, 12);
        expect(0.5 * content).toBeCloseTo(2.7, 12);
    });

    it('adds the structural bonus once per block and counts the source text once', () => {
        const note = '# Olá\n\n- a\n- b';
        const textWeight = 5 + 0.4 * 9;

        expect(measureNormalNoteContent(note)).toBeCloseTo(
            textWeight + 0.8 * 2,
            12,
        );
    });

    it('measures an empty note as zero', () => {
        expect(measureNormalNoteContent('')).toBe(0);
    });
});
