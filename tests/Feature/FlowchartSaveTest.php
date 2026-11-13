<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Content\Flowchart;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class FlowchartSaveTest extends TestCase
{
    use RefreshDatabase;

    private string $note;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $this->note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey())->id;
    }

    public function testRf04SavesAFlowchartInTheNoteAndMeasuresIt(): void
    {
        $content = (string) json_encode([
            'format' => Flowchart::FORMAT,
            'version' => 1,
            'description' => '',
            'nodes' => [
                ['id' => 'a', 'kind' => 'start', 'text' => '', 'x' => 0, 'y' => 0],
                ['id' => 'b', 'kind' => 'io', 'text' => '', 'x' => 0, 'y' => 120],
            ],
            'edges' => [['id' => 'e1', 'from' => 'a', 'to' => 'b', 'text' => '']],
        ]);

        $this->patchJson(route('cvc.documents.update', $this->note), ['content' => $content, 'revision' => 1])
            ->assertOk()
            ->assertJsonPath('document.content', $content);

        self::assertEqualsWithDelta(2.0, MarkdownDocument::query()->findOrFail($this->note)->own_content, 1e-12);
    }

    public function testRf05RefusesAFlowchartThatDoesNotHoldTogetherWithoutSavingIt(): void
    {
        $broken = (string) json_encode([
            'format' => Flowchart::FORMAT,
            'version' => 1,
            'description' => '',
            'nodes' => [],
            'edges' => [['id' => 'e1', 'from' => 'a', 'to' => 'b', 'text' => '']],
        ]);

        $this->patchJson(route('cvc.documents.update', $this->note), ['content' => $broken, 'revision' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');

        self::assertSame(1, MarkdownDocument::query()->findOrFail($this->note)->revision);
    }
}
