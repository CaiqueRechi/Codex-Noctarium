type OpenBlock =
    | { kind: 'none' }
    | { kind: 'paragraph' }
    | { kind: 'quote' }
    | { kind: 'indentedCode' }
    | { kind: 'fence'; character: string; length: number }
    | { kind: 'list'; markerType: string; contentIndent: number };

type LineOutcome = { open: OpenBlock; startsBlock: boolean };

type ListItem = {
    markerType: string;
    contentIndent: number;
    canInterruptParagraph: boolean;
};

const tabStop = 4;
const codeIndent = 4;
const noBlock: OpenBlock = { kind: 'none' };
const blankLine = /^[ \t]*$/;
const fenceOpening = /^(`{3,}|~{3,})(.*)$/;
const fenceClosing = /^ {0,3}(`+|~+)[ \t]*$/;
const setextUnderline = /^(=+|-+)[ \t]*$/;
const thematicBreak = /^([-*_])([ \t]*\1){2,}[ \t]*$/;
const atxHeading = /^#{1,6}([ \t]|$)/;
const listMarker = /^(?:([-+*])|(\d{1,9})([.)]))([ \t]+|$)(.*)$/;

export function countTopLevelMarkdownBlocks(markdown: string): number {
    let blockCount = 0;
    let open = noBlock;
    let followsBlankLine = false;

    for (const sourceLine of markdown.replace(/\r\n?/g, '\n').split('\n')) {
        const line = expandLeadingTabs(sourceLine);

        if (open.kind === 'fence') {
            open = closesFence(line, open) ? noBlock : open;
            continue;
        }

        if (blankLine.test(line)) {
            open = endsAtBlankLine(open) ? noBlock : open;
            followsBlankLine = true;
            continue;
        }

        const outcome = readLine(open, line, followsBlankLine);
        blockCount += outcome.startsBlock ? 1 : 0;
        open = outcome.open;
        followsBlankLine = false;
    }

    return blockCount;
}

function readLine(
    open: OpenBlock,
    line: string,
    followsBlankLine: boolean,
): LineOutcome {
    const indent = line.length - line.trimStart().length;
    const text = line.slice(indent);
    const continuesLazily = !followsBlankLine && acceptsLazyText(open);

    if (open.kind === 'list' && indent >= open.contentIndent) {
        return continuing(open);
    }

    if (indent >= codeIndent) {
        return continuesLazily || open.kind === 'indentedCode'
            ? continuing(open)
            : starting({ kind: 'indentedCode' });
    }

    const fence = fenceOpening.exec(text);

    if (fence && !(fence[1][0] === '`' && fence[2].includes('`'))) {
        return starting({
            kind: 'fence',
            character: fence[1][0],
            length: fence[1].length,
        });
    }

    if (
        open.kind === 'paragraph' &&
        !followsBlankLine &&
        setextUnderline.test(text)
    ) {
        return continuing(noBlock);
    }

    if (thematicBreak.test(text) || atxHeading.test(text)) {
        return starting(noBlock);
    }

    if (text.startsWith('>')) {
        return open.kind === 'quote'
            ? continuing(open)
            : starting({ kind: 'quote' });
    }

    const item = readListItem(text, indent);
    const interruptsParagraph =
        open.kind !== 'paragraph' ||
        followsBlankLine ||
        item?.canInterruptParagraph;

    if (item && interruptsParagraph) {
        const list: OpenBlock = {
            kind: 'list',
            markerType: item.markerType,
            contentIndent: item.contentIndent,
        };

        return open.kind === 'list' && open.markerType === item.markerType
            ? continuing(list)
            : starting(list);
    }

    return continuesLazily ? continuing(open) : starting({ kind: 'paragraph' });
}

function readListItem(text: string, indent: number): ListItem | null {
    const marker = listMarker.exec(text);

    if (!marker) {
        return null;
    }

    const [, bullet, number, delimiter, gap, content] = marker;
    const markerWidth = (bullet ?? `${number}${delimiter}`).length;
    const isEmpty = content.trim() === '';
    const gapWidth = isEmpty || gap.length > codeIndent ? 1 : gap.length;

    return {
        markerType: bullet ?? delimiter,
        contentIndent: indent + markerWidth + gapWidth,
        canInterruptParagraph:
            !isEmpty && (bullet !== undefined || Number(number) === 1),
    };
}

function closesFence(
    line: string,
    fence: Extract<OpenBlock, { kind: 'fence' }>,
): boolean {
    const closing = fenceClosing.exec(line);

    return (
        closing !== null &&
        closing[1][0] === fence.character &&
        closing[1].length >= fence.length
    );
}

function endsAtBlankLine(open: OpenBlock): boolean {
    return open.kind === 'paragraph' || open.kind === 'quote';
}

function acceptsLazyText(open: OpenBlock): boolean {
    return (
        open.kind === 'paragraph' ||
        open.kind === 'quote' ||
        open.kind === 'list'
    );
}

function expandLeadingTabs(line: string): string {
    let column = 0;
    let position = 0;

    while (line[position] === ' ' || line[position] === '\t') {
        column += line[position] === '\t' ? tabStop - (column % tabStop) : 1;
        position++;
    }

    return ' '.repeat(column) + line.slice(position);
}

function continuing(open: OpenBlock): LineOutcome {
    return { open, startsBlock: false };
}

function starting(open: OpenBlock): LineOutcome {
    return { open, startsBlock: true };
}
