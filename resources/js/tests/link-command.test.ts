import { describe, expect, it } from 'vitest';

import {
    findLinkCommand,
    removeLinkCommand,
} from '../documents/link-command';

describe('RF-10 link command typed in a note', () => {
    it('reads /link and /l followed by the start of a title', () => {
        expect(findLinkCommand('texto /link pla', 15)).toEqual({
            start: 6,
            end: 15,
            query: 'pla',
        });
        expect(findLinkCommand('/l Plan', 7)).toEqual({
            start: 0,
            end: 7,
            query: 'Plan',
        });
    });

    it('waits for at least one character after the command', () => {
        expect(findLinkCommand('/link ', 6)).toBeNull();
        expect(findLinkCommand('/l', 2)).toBeNull();
    });

    it('accepts no other form, $l included (D-09)', () => {
        expect(findLinkCommand('$l pla', 6)).toBeNull();
        expect(findLinkCommand('/links pla', 10)).toBeNull();
        expect(findLinkCommand('a/l pla', 7)).toBeNull();
    });

    it('only looks at the command right before the caret, on its line', () => {
        expect(findLinkCommand('/l pla\nnova linha', 17)).toBeNull();
        expect(findLinkCommand('/l pla e mais', 6)?.query).toBe('pla');
    });

    it('takes a title with spaces in it', () => {
        expect(findLinkCommand('/link Atlas dos', 15)?.query).toBe(
            'Atlas dos',
        );
    });

    it('removes the chosen command and keeps the text around it', () => {
        const text = 'antes /l pla depois';
        const command = findLinkCommand(text, 12)!;

        expect(removeLinkCommand(text, command)).toBe('antes depois');
        expect(
            removeLinkCommand('/l pla', findLinkCommand('/l pla', 6)!),
        ).toBe('');
    });
});
