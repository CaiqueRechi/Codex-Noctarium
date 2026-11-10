<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Content;

final readonly class MarkdownOpenBlock
{
    public const NONE = 'none';

    public const PARAGRAPH = 'paragraph';

    public const QUOTE = 'quote';

    public const INDENTED_CODE = 'indentedCode';

    public const FENCE = 'fence';

    public const LIST = 'list';

    /**
     * @param  string  $marker  fence character, or the bullet or delimiter that identifies a list
     * @param  int  $size  fence length, or the indentation of a list item's content
     */
    private function __construct(
        public string $kind,
        public string $marker,
        public int $size,
        public bool $startsBlock,
    ) {}

    public static function none(): self
    {
        return new self(self::NONE, '', 0, false);
    }

    public static function starting(string $kind, string $marker = '', int $size = 0): self
    {
        return new self($kind, $marker, $size, true);
    }

    public static function resuming(string $kind, string $marker, int $size): self
    {
        return new self($kind, $marker, $size, false);
    }

    public function continuing(): self
    {
        return new self($this->kind, $this->marker, $this->size, false);
    }

    public function endsAtBlankLine(): bool
    {
        return $this->kind === self::PARAGRAPH || $this->kind === self::QUOTE;
    }

    public function acceptsLazyText(): bool
    {
        return in_array($this->kind, [self::PARAGRAPH, self::QUOTE, self::LIST], true);
    }
}
