import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom' },
}));

import { CosmicNoteNode } from '../canvas/cosmic-note-node';
import type { CosmicNoteData } from '../canvas/cosmic-note-node';
import { truncateCanvasTitle } from '../canvas/truncate-canvas-title';

describe('RF-02 / RN-08 canvas title presentation', () => {
    it.each(['', 'Nota curta', 'a'.repeat(20)])(
        'keeps a title of at most 20 characters intact: %s',
        (title) => {
            expect(truncateCanvasTitle(title)).toBe(title);
        },
    );

    it('shows 20 title characters plus an ellipsis only when truncation is needed', () => {
        expect(truncateCanvasTitle('abcdefghijklmnopqrstu')).toBe(
            'abcdefghijklmnopqrst…',
        );
    });

    it.each(['á', 'a\u0301', '👨‍👩‍👧‍👦', '🇧🇷'])(
        'counts %s as one visible character without breaking it',
        (character) => {
            expect(truncateCanvasTitle(character.repeat(20))).toBe(
                character.repeat(20),
            );
            expect(truncateCanvasTitle(character.repeat(21))).toBe(
                `${character.repeat(20)}…`,
            );
        },
    );

    function renderNote(data: CosmicNoteData) {
        return render(
            <CosmicNoteNode
                id="node"
                type="cosmic"
                data={data}
                selected={false}
                dragging={false}
                draggable
                selectable
                deletable
                isConnectable={false}
                zIndex={0}
                positionAbsoluteX={0}
                positionAbsoluteY={0}
            />,
        );
    }

    it.each(['context', 'document'] as const)(
        'truncates a %s label without changing its complete title',
        (kind) => {
            const title = 'abcdefghijklmnopqrstTítulo completo';
            const data: CosmicNoteData = {
                kind,
                label: title,
                diameter: 200,
                isPinned: false,
                isUnmeasured: false,
            };
            renderNote(data);

            expect(
                screen.getByText('abcdefghijklmnopqrst…'),
            ).toBeInTheDocument();
            expect(screen.getByRole('article')).toHaveAttribute('title', title);
            expect(data.label).toBe(title);
        },
    );

    it('escapes markup in both the visible label and complete title attribute', () => {
        const title = '<img src=x onerror=alert(1)>';
        renderNote({
            kind: 'document',
            label: title,
            diameter: 200,
            isPinned: false,
            isUnmeasured: false,
        });

        expect(
            screen.getByText(truncateCanvasTitle(title)),
        ).toBeInTheDocument();
        expect(screen.getByRole('article')).toHaveAttribute('title', title);
        expect(document.querySelector('img')).toBeNull();
    });
});
