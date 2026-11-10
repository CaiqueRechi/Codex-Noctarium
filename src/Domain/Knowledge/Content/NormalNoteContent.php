<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Content;

use Normalizer;

/**
 * Server-side twin of measureNormalNoteContent in
 * resources/js/canvas/math/content-weight.ts. Both must agree on
 * tests/Fixtures/normal-note-measure.json; change them together.
 */
final readonly class NormalNoteContent
{
    private const LETTER_OR_NUMBER_UNITS = 5;

    private const OTHER_CHARACTER_UNITS = 2;

    private const UNITS_PER_POINT = 5;

    private const BLOCK_BONUS = 0.8;

    private const EMOJI_CHARACTER = '/\p{Extended_Pictographic}|\p{Regional_Indicator}|\x{20e3}/u';

    private const LETTER_OR_NUMBER = '/^[\p{L}\p{N}]\p{M}*\z/u';

    // An ASCII character between ASCII neighbours is always a character of its
    // own, so whole runs are weighed at once; one callback per character made
    // a 1 MB note take about two seconds to save.
    private const CHARACTER = '/([\x00-\x7F]+(?=[\x00-\x7F]|\z))|\X/u';

    public function __construct(private MarkdownBlockCounter $blockCounter) {}

    public function measure(string $markdown): float
    {
        $source = mb_scrub($markdown, 'UTF-8');

        return $this->textWeight($source) + self::BLOCK_BONUS * $this->blockCounter->count($source);
    }

    private function textWeight(string $text): float
    {
        $unixLines = str_replace(["\r\n", "\r"], "\n", $text);
        $normalized = Normalizer::normalize($unixLines, Normalizer::FORM_C);
        $weightUnits = 0;

        preg_replace_callback(
            self::CHARACTER,
            function (array $match) use (&$weightUnits): string {
                $weightUnits += ($match[1] ?? '') === ''
                    ? $this->characterUnits($match[0])
                    : $this->asciiRunUnits($match[1]);

                return '';
            },
            $normalized === false ? $unixLines : $normalized,
        );

        return $weightUnits / self::UNITS_PER_POINT;
    }

    private function characterUnits(string $character): int
    {
        $isLetterOrNumber = preg_match(self::EMOJI_CHARACTER, $character) !== 1
            && preg_match(self::LETTER_OR_NUMBER, $character) === 1;

        return $isLetterOrNumber ? self::LETTER_OR_NUMBER_UNITS : self::OTHER_CHARACTER_UNITS;
    }

    private function asciiRunUnits(string $run): int
    {
        $lettersAndNumbers = (int) preg_match_all('/[A-Za-z0-9]/', $run);

        return $lettersAndNumbers * self::LETTER_OR_NUMBER_UNITS
            + (strlen($run) - $lettersAndNumbers) * self::OTHER_CHARACTER_UNITS;
    }
}
