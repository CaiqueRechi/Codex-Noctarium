import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => ({
    Handle: ({
        id,
        className,
        isConnectable,
        style,
        'aria-label': label,
    }: {
        id?: string;
        className?: string;
        isConnectable?: boolean;
        style?: object;
        'aria-label'?: string;
    }) => (
        <div
            className={className}
            data-handle-id={id}
            data-connectable={isConnectable === false ? 'false' : 'true'}
            aria-label={label}
            style={style}
        />
    ),
    Position: { Top: 'top', Bottom: 'bottom', Right: 'right' },
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

    it('carries the tone a note was painted with, and none by default', () => {
        renderNote({ color: 'nebulosa' });
        expect(screen.getByRole('article')).toHaveAttribute(
            'data-color',
            'nebulosa',
        );
    });

    it('leaves an unpainted note without a tone', () => {
        renderNote();
        expect(screen.getByRole('article')).not.toHaveAttribute('data-color');
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

describe('RN-02 link dot on the edge of a note', () => {
    it('puts a connectable dot on the edge of a note', () => {
        const { container } = renderNote({ label: 'Planeta', diameter: 300 });
        const dot = container.querySelector<HTMLElement>(
            '.cvc-cosmic-note__dot',
        );

        expect(dot).not.toBeNull();
        expect(dot).toHaveAttribute('data-handle-id', 'link');
        expect(dot).toHaveAttribute('data-connectable', 'true');
        expect(dot!.style.left).toBe('calc(50% + 150px)');
        expect(dot).toHaveAttribute(
            'aria-label',
            expect.stringContaining('Planeta'),
        );
    });

    it('gives no dot to a context, which relations do not connect', () => {
        const { container } = renderNote({ kind: 'context' });

        expect(container.querySelector('.cvc-cosmic-note__dot')).toBeNull();
    });

    it('keeps the anchors that draw relations out of reach of the pointer', () => {
        const { container } = renderNote();
        const anchors = container.querySelectorAll('.cvc-cosmic-note__anchor');

        expect(anchors).toHaveLength(2);
        anchors.forEach((anchor) =>
            expect(anchor).toHaveAttribute('data-connectable', 'false'),
        );
    });
});
