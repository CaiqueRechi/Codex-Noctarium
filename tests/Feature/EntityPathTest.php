<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

final class EntityPathTest extends TestCase
{
    use RefreshDatabase;

    public function testRf09TellsWhereANoteSitsFromItsUniverseDown(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());

        $this->getJson(route('cvc.entities.path', $note->id))
            ->assertOk()
            ->assertExactJson(['path' => [
                ['id' => (string) $context->parent_id, 'name' => $context->parent?->name],
                ['id' => (string) $context->getKey(), 'name' => $context->name],
            ]]);
    }

    public function testRf09DoesNotTellWhereANoteOutsideTheVaultSits(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        $this->getJson(route('cvc.entities.path', (string) Str::uuid()))->assertNotFound();
    }
}
