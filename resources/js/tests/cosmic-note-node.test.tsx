import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom' },
}));

import { CosmicNoteNode } from '../canvas/cosmic-note-node';
import type { CosmicNoteData } from '../canvas/cosmic-note-node';

function renderNote(overrides: Partial<CosmicNoteData> = {}, selected = false) {
    const data: CosmicNoteData = {
        kind: 'document',
        label: 'Nota',
        diameter: 300,
        isPinned: false,
        isUnmeasured: false,
        ...overrides,
    };

    return render(
        <CosmicNoteNode
            id="node"
            type="cosmic"
            data={data}
            selected={selected}
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

describe('RF-03 note drawn as a circle of its area', () => {
    it('draws the circle with the diameter given by the physics', () => {
        const { container } = renderNote({ diameter: 412.5 });

        expect(
            container.querySelector<HTMLElement>('.cvc-cosmic-note__body')!
                .style,
        ).toMatchObject({ width: '412.5px', height: '412.5px' });
    });

    it('shows at most 20 characters of the title and keeps the whole title on hover', () => {
        const title = 'abcdefghijklmnopqrstTítulo completo';
        renderNote({ label: title });

        expect(screen.getByText('abcdefghijklmnopqrst…')).toBeInTheDocument();
        expect(screen.getByRole('article')).toHaveAttribute('title', title);
    });

    it('marks a pinned, a selected and a nested-space note for styling', () => {
        renderNote({ kind: 'context', isPinned: true }, true);

        const article = screen.getByRole('article');

        expect(article).toHaveAttribute('data-kind', 'context');
        expect(article).toHaveAttribute('data-pinned', 'true');
        expect(article).toHaveAttribute('data-selected', 'true');
    });

    it('says that the size of an unmeasured note is provisional', () => {
        renderNote({ label: 'Antiga', isUnmeasured: true });

        const article = screen.getByRole('article');

        expect(article).toHaveAttribute('data-unmeasured', 'true');
        expect(article.getAttribute('title')).toContain(
            'conteúdo ainda não medido',
        );
    });
});
