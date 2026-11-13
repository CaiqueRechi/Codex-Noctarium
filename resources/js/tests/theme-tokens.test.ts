import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relative: string) =>
    readFileSync(new URL(relative, import.meta.url), 'utf8');

const styles = read('../../css/cvc.css');
const presets = read('../../css/presets.css');
// Written by the page on every viewport move, not part of the theme.
const pageVariables = new Set(['--cvc-zoom']);

describe('RN-20 replaceable theme', () => {
    it('keeps every color of the screens in the preset', () => {
        expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(styles).not.toMatch(/\b(?:rgb|hsl|oklch)a?\(/i);
    });

    it('defines in the preset every token the screens use', () => {
        const used = new Set(
            [...styles.matchAll(/var\((--cvc-[a-z-]+)/g)].map(
                (match) => match[1],
            ),
        );
        const defined = new Set(
            [...presets.matchAll(/(--cvc-[a-z-]+)\s*:/g)].map(
                (match) => match[1],
            ),
        );

        const missing = [...used].filter(
            (token) => !defined.has(token) && !pageVariables.has(token),
        );

        expect(missing).toEqual([]);
    });

    it('loads only fonts served by the package', () => {
        const fonts = read('../../css/fonts.css');

        expect(fonts).not.toMatch(/https?:\/\//);
        expect([...fonts.matchAll(/url\('([^']+)'\)/g)]).toHaveLength(3);
    });
});
