<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Unit;

use CrowVaultCanvas\Domain\Knowledge\Content\MarkdownBlockCounter;
use CrowVaultCanvas\Domain\Knowledge\Content\NormalNoteContent;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class NormalNoteContentTest extends TestCase
{
    private const TOLERANCE = 1e-12;

    #[DataProvider('sharedCases')]
    public function testRf03MeasuresANormalNoteExactlyAsTheBrowserDoes(
        string $markdown,
        int $blockCount,
        float $ownContent,
    ): void {
        $counter = new MarkdownBlockCounter;

        self::assertSame($blockCount, $counter->count($markdown));
        self::assertEqualsWithDelta(
            $ownContent,
            (new NormalNoteContent($counter))->measure($markdown),
            self::TOLERANCE,
        );
    }

    public function testRf03MatchesTheApprovedExamples(): void
    {
        $content = new NormalNoteContent(new MarkdownBlockCounter);

        self::assertEqualsWithDelta(5.4, $content->measure('**Olá**'), self::TOLERANCE);
        self::assertEqualsWithDelta(6.2 + 0.8, $content->measure('Olá, ç1!'), self::TOLERANCE);
        self::assertSame(0.0, $content->measure(''));
    }

    public function testRf03MeasuresInvalidUtf8InsteadOfFailing(): void
    {
        $content = new NormalNoteContent(new MarkdownBlockCounter);

        self::assertEqualsWithDelta(
            $content->measure('a?b'),
            $content->measure("a\xFFb"),
            self::TOLERANCE,
        );
    }

    public function testRf03CountsALargeNoteAndAHostileLineWithoutGivingUp(): void
    {
        $counter = new MarkdownBlockCounter;
        $paragraphs = implode("\n\n", array_map(fn (int $index): string => "p{$index}", range(1, 20000)));

        self::assertSame(20000, $counter->count($paragraphs));
        self::assertSame(1, $counter->count(str_repeat('- ', 20000).'x'));
        self::assertSame(1, $counter->count(str_repeat('- ', 20000)));
        self::assertSame(1, $counter->count(str_repeat('`', 20000)."\n".str_repeat('x', 200000)."\n\nfim"));
        self::assertSame(2, $counter->count(str_repeat('`', 20000)."\n\n".str_repeat('`', 20000)."\nfim"));
    }

    /** @return iterable<string, array{string, int, float}> */
    public static function sharedCases(): iterable
    {
        $cases = json_decode(
            (string) file_get_contents(__DIR__.'/../Fixtures/normal-note-measure.json'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($cases as $case) {
            yield $case['name'] => [$case['markdown'], $case['blockCount'], (float) $case['ownContent']];
        }
    }
}
