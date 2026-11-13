<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Content;

/**
 * C_i of any note (canvas-cosmico-formulas.md, section 1): a normal note is
 * measured from its Markdown; a flowchart from its description, the
 * editable text of its blocks and arrows, 0.8 per block and 0.4 per arrow.
 * The JSON that stores a flowchart is never counted as text.
 */
final readonly class NoteContent
{
    private const BLOCK_WEIGHT = 0.8;

    private const ARROW_WEIGHT = 0.4;

    public function __construct(private NormalNoteContent $normalNote) {}

    public function measure(string $content): float
    {
        if (! Flowchart::isFlowchart($content)) {
            return $this->normalNote->measure($content);
        }

        try {
            $flowchart = Flowchart::fromJson($content);
        } catch (InvalidFlowchart) {
            return $this->normalNote->measure($content);
        }

        $texts = [
            ...array_column($flowchart->nodes, 'text'),
            ...array_column($flowchart->edges, 'text'),
        ];

        return $this->normalNote->measure($flowchart->description)
            + array_sum(array_map($this->normalNote->measureText(...), $texts))
            + self::BLOCK_WEIGHT * count($flowchart->nodes)
            + self::ARROW_WEIGHT * count($flowchart->edges);
    }
}
