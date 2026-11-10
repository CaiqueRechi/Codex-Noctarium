<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Content;

/**
 * Server-side twin of resources/js/canvas/math/markdown-blocks.ts. Both must
 * agree on tests/Fixtures/normal-note-measure.json; change them together.
 */
final class MarkdownBlockCounter
{
    private const TAB_STOP = 4;

    private const CODE_INDENT = 4;

    private const BLANK_LINE = '/^[ \t]*\z/';

    private const FENCE_OPENING = '/^(`{3,}|~{3,})(.*)\z/s';

    private const FENCE_CLOSING = '/^ {0,3}(`+|~+)[ \t]*\z/';

    private const SETEXT_UNDERLINE = '/^(=+|-+)[ \t]*\z/';

    private const ATX_HEADING = '/^#{1,6}([ \t]|\z)/';

    private const LIST_MARKER = '/^(?:([-+*])|(\d{1,9})([.)]))([ \t]+|\z)(.*)\z/s';

    public function count(string $markdown): int
    {
        $blockCount = 0;
        $open = MarkdownOpenBlock::none();
        $followsBlankLine = false;

        foreach (explode("\n", str_replace(["\r\n", "\r"], "\n", $markdown)) as $sourceLine) {
            $line = $this->expandLeadingTabs($sourceLine);

            if ($open->kind === MarkdownOpenBlock::FENCE) {
                $open = $this->closesFence($line, $open) ? MarkdownOpenBlock::none() : $open;

                continue;
            }

            if (preg_match(self::BLANK_LINE, $line) === 1) {
                $open = $open->endsAtBlankLine() ? MarkdownOpenBlock::none() : $open;
                $followsBlankLine = true;

                continue;
            }

            $next = $this->readLine($open, $line, $followsBlankLine);
            $blockCount += $next->startsBlock ? 1 : 0;
            $open = $next;
            $followsBlankLine = false;
        }

        return $blockCount;
    }

    private function readLine(MarkdownOpenBlock $open, string $line, bool $followsBlankLine): MarkdownOpenBlock
    {
        $indent = strspn($line, ' ');
        $text = substr($line, $indent);
        $continuesLazily = ! $followsBlankLine && $open->acceptsLazyText();

        if ($open->kind === MarkdownOpenBlock::LIST && $indent >= $open->size) {
            return $open->continuing();
        }

        if ($indent >= self::CODE_INDENT) {
            return $continuesLazily || $open->kind === MarkdownOpenBlock::INDENTED_CODE
                ? $open->continuing()
                : MarkdownOpenBlock::starting(MarkdownOpenBlock::INDENTED_CODE);
        }

        if (preg_match(self::FENCE_OPENING, $text, $fence) === 1
            && ! ($fence[1][0] === '`' && str_contains($fence[2], '`'))) {
            return MarkdownOpenBlock::starting(MarkdownOpenBlock::FENCE, $fence[1][0], strlen($fence[1]));
        }

        if ($open->kind === MarkdownOpenBlock::PARAGRAPH
            && ! $followsBlankLine
            && preg_match(self::SETEXT_UNDERLINE, $text) === 1) {
            return MarkdownOpenBlock::none();
        }

        if ($this->isThematicBreak($text) || preg_match(self::ATX_HEADING, $text) === 1) {
            return MarkdownOpenBlock::starting(MarkdownOpenBlock::NONE);
        }

        if (str_starts_with($text, '>')) {
            return $open->kind === MarkdownOpenBlock::QUOTE
                ? $open->continuing()
                : MarkdownOpenBlock::starting(MarkdownOpenBlock::QUOTE);
        }

        $item = $this->readListItem($text, $indent, $open, $followsBlankLine);

        if ($item !== null) {
            return $item;
        }

        return $continuesLazily
            ? $open->continuing()
            : MarkdownOpenBlock::starting(MarkdownOpenBlock::PARAGRAPH);
    }

    private function readListItem(
        string $text,
        int $indent,
        MarkdownOpenBlock $open,
        bool $followsBlankLine,
    ): ?MarkdownOpenBlock {
        if (preg_match(self::LIST_MARKER, $text, $marker) !== 1) {
            return null;
        }

        [, $bullet, $number, $delimiter, $gap, $content] = $marker;
        $isBullet = $bullet !== '';
        $isEmpty = preg_match(self::BLANK_LINE, $content) === 1;
        $canInterruptParagraph = ! $isEmpty && ($isBullet || (int) $number === 1);

        if ($open->kind === MarkdownOpenBlock::PARAGRAPH && ! $followsBlankLine && ! $canInterruptParagraph) {
            return null;
        }

        $markerType = $isBullet ? $bullet : $delimiter;
        $markerWidth = strlen($isBullet ? $bullet : $number.$delimiter);
        $gapWidth = $isEmpty || strlen($gap) > self::CODE_INDENT ? 1 : strlen($gap);
        $contentIndent = $indent + $markerWidth + $gapWidth;

        return $open->kind === MarkdownOpenBlock::LIST && $open->marker === $markerType
            ? MarkdownOpenBlock::resuming(MarkdownOpenBlock::LIST, $markerType, $contentIndent)
            : MarkdownOpenBlock::starting(MarkdownOpenBlock::LIST, $markerType, $contentIndent);
    }

    // Not a regular expression on purpose: a long line of repeated markers
    // exhausts the PCRE JIT stack, and preg_match then reports "no match".
    private function isThematicBreak(string $text): bool
    {
        $marks = str_replace([' ', "\t"], '', $text);

        return strlen($marks) >= 3
            && str_contains('-*_', $marks[0])
            && strspn($marks, $marks[0]) === strlen($marks);
    }

    private function closesFence(string $line, MarkdownOpenBlock $fence): bool
    {
        return preg_match(self::FENCE_CLOSING, $line, $closing) === 1
            && $closing[1][0] === $fence->marker
            && strlen($closing[1]) >= $fence->size;
    }

    private function expandLeadingTabs(string $line): string
    {
        $column = 0;
        $position = 0;
        $length = strlen($line);

        while ($position < $length && ($line[$position] === ' ' || $line[$position] === "\t")) {
            $column += $line[$position] === "\t" ? self::TAB_STOP - ($column % self::TAB_STOP) : 1;
            $position++;
        }

        return str_repeat(' ', $column).substr($line, $position);
    }
}
