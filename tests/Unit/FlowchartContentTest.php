<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Unit;

use CrowVaultCanvas\Domain\Knowledge\Content\Flowchart;
use CrowVaultCanvas\Domain\Knowledge\Content\InvalidFlowchart;
use CrowVaultCanvas\Domain\Knowledge\Content\MarkdownBlockCounter;
use CrowVaultCanvas\Domain\Knowledge\Content\NormalNoteContent;
use CrowVaultCanvas\Domain\Knowledge\Content\NoteContent;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class FlowchartContentTest extends TestCase
{
    private function measure(string $content): float
    {
        return (new NoteContent(new NormalNoteContent(new MarkdownBlockCounter())))->measure($content);
    }

    /** @param list<array<string, mixed>> $nodes @param list<array<string, mixed>> $edges */
    private function flowchart(array $nodes, array $edges, string $description = ''): string
    {
        return (string) json_encode([
            'format' => Flowchart::FORMAT,
            'version' => 1,
            'description' => $description,
            'nodes' => $nodes,
            'edges' => $edges,
        ]);
    }

    public function testRf04MeasuresTwoEmptyBlocksAndOneArrowAsTwo(): void
    {
        $content = $this->flowchart(
            [
                ['id' => 'a', 'kind' => 'start', 'text' => '', 'x' => 0, 'y' => 0],
                ['id' => 'b', 'kind' => 'process', 'text' => '', 'x' => 0, 'y' => 100],
            ],
            [['id' => 'e1', 'from' => 'a', 'to' => 'b', 'text' => '']],
        );

        self::assertEqualsWithDelta(2.0, $this->measure($content), 1e-12);
    }

    public function testRf04CountsTheTextOfBlocksArrowsAndDescriptionButNotTheJson(): void
    {
        $content = $this->flowchart(
            [['id' => 'a', 'kind' => 'process', 'text' => 'Olá, ç1!', 'x' => 0, 'y' => 0]],
            [],
            '**Olá**',
        );

        // 6.2 for the block's text, 0.8 for the block, 5.4 for the description.
        self::assertEqualsWithDelta(6.2 + 0.8 + 5.4, $this->measure($content), 1e-12);
    }

    public function testRf04MeasuresANormalNoteAsBefore(): void
    {
        self::assertEqualsWithDelta(5.4, $this->measure('**Olá**'), 1e-12);
    }

    /** @return array<string, array{string}> */
    public static function brokenFlowcharts(): array
    {
        $node = ['id' => 'a', 'kind' => 'process', 'text' => '', 'x' => 0, 'y' => 0];

        return [
            'unknown version' => [(string) json_encode(['format' => Flowchart::FORMAT, 'version' => 2, 'nodes' => [], 'edges' => []])],
            'unknown kind' => [(string) json_encode(['format' => Flowchart::FORMAT, 'version' => 1, 'nodes' => [[...$node, 'kind' => 'loop']], 'edges' => []])],
            'repeated id' => [(string) json_encode(['format' => Flowchart::FORMAT, 'version' => 1, 'nodes' => [$node, $node], 'edges' => []])],
            'arrow to nowhere' => [(string) json_encode(['format' => Flowchart::FORMAT, 'version' => 1, 'nodes' => [$node], 'edges' => [['id' => 'e', 'from' => 'a', 'to' => 'z', 'text' => '']]])],
            'path as id' => [(string) json_encode(['format' => Flowchart::FORMAT, 'version' => 1, 'nodes' => [[...$node, 'id' => '../x']], 'edges' => []])],
        ];
    }

    #[DataProvider('brokenFlowcharts')]
    public function testRf05RefusesAFlowchartThatDoesNotHoldTogether(string $content): void
    {
        self::assertTrue(Flowchart::isFlowchart($content));
        $this->expectException(InvalidFlowchart::class);

        Flowchart::fromJson($content);
    }
}
