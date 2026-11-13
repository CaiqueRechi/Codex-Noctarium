// RF-10 and D-09: "/link title" or "/l title" right before the caret asks
// to connect the note to another one. Only these two forms exist.
const commandBeforeCaret = /(^|\s)\/(?:link|l) ([^\n/]*)$/;

export type LinkCommand = {
    start: number;
    end: number;
    query: string;
};

export function findLinkCommand(
    text: string,
    caret: number,
): LinkCommand | null {
    const match = commandBeforeCaret.exec(text.slice(0, caret));

    if (!match || match[2].trim() === '') {
        return null;
    }

    return {
        start: match.index + match[1].length,
        end: caret,
        query: match[2],
    };
}

// Choosing a target consumes the command: it leaves the text, which keeps
// only what was written around it.
export function removeLinkCommand(text: string, command: LinkCommand): string {
    const before = text.slice(0, command.start);
    const after = text.slice(command.end);

    return before.endsWith(' ') && after.startsWith(' ')
        ? before + after.slice(1)
        : before + after;
}
