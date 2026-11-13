<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Search\SearchVault;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class SearchPathTest extends TestCase
{
    use RefreshDatabase;

    public function testRf07TellsTheUniverseAndPathOfEveryResult(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $universe = $context->parent;
        $note = $this->indexedNote((string) $context->getKey(), 'Planeta', 'órbita elíptica');
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note);
        $this->indexedNote((string) $space->getKey(), 'Lua', 'órbita circular');

        $results = collect($this->app->make(SearchVault::class)->handle('órbita', null, null, null))
            ->keyBy('title');

        self::assertSame(
            [
                ['id' => (string) $universe?->getKey(), 'name' => $universe?->name],
                ['id' => (string) $context->getKey(), 'name' => $context->name],
            ],
            $results['Planeta']['path'],
        );
        self::assertSame(
            [(string) $universe?->getKey(), (string) $context->getKey(), (string) $space->getKey()],
            array_column($results['Lua']['path'], 'id'),
        );
        self::assertSame('Planeta', $results['Lua']['path'][2]['name']);
    }

    private function indexedNote(string $contextId, string $title, string $content): string
    {
        $note = $this->app->make(CreateDocument::class)->handle($contextId);
        KnowledgeEntity::query()->whereKey($note->id)->update(['title' => $title]);
        $this->app->make(SaveDocument::class)->handle($note->id, $content, 1);
        (new IndexKnowledgeEntity($note->id))->handle($this->app->make(MarkdownStorage::class));

        return $note->id;
    }
}
