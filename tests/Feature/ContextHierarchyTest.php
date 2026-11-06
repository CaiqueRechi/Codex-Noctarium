<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Application\Contexts\OpenContextSlice;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class ContextHierarchyTest extends TestCase
{
    use RefreshDatabase;

    public function test_contexts_support_arbitrary_application_depth(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $parentId = (string) KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail()
            ->getKey();
        $createContext = $this->app->make(CreateContext::class);

        for ($depth = 1; $depth <= 100; $depth++) {
            $parentId = (string) $createContext
                ->handle("Assunto {$depth}", $parentId)
                ->getKey();
        }

        $slice = $this->app->make(OpenContextSlice::class)->handle($parentId);

        self::assertCount(1, $slice->contexts);
        self::assertSame($parentId, $slice->contexts->first()?->getKey());
        self::assertCount(102, $slice->breadcrumbs);
        self::assertSame('Meu Universo', $slice->breadcrumbs->first()?->name);
        self::assertSame('Assunto 100', $slice->breadcrumbs->last()?->name);
    }

    public function test_context_endpoint_loads_only_the_current_slice(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $parent = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
        $createContext = $this->app->make(CreateContext::class);
        $child = $createContext->handle('Filho', (string) $parent->getKey());
        $createContext->handle('Neto', (string) $child->getKey());

        $this->getJson(route('cvc.contexts.show', $parent))
            ->assertOk()
            ->assertJsonPath('slice.contexts.0.id', $parent->getKey())
            ->assertJsonPath('slice.contexts.0.contexts.0.id', $child->getKey())
            ->assertJsonPath('slice.contexts.0.contexts.0.hasChildren', true)
            ->assertJsonCount(0, 'slice.contexts.0.contexts.0.contexts')
            ->assertJsonCount(2, 'slice.breadcrumbs');
    }

    public function test_context_creation_is_scoped_to_the_configured_vault(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $parent = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();

        $this->postJson(route('cvc.contexts.store'), [
            'name' => 'Subassunto',
            'parent_id' => $parent->getKey(),
        ])
            ->assertCreated()
            ->assertJsonPath('context.name', 'Subassunto')
            ->assertJsonPath('context.parentId', $parent->getKey());

        $otherVault = Vault::query()->create(['name' => 'Outro vault']);
        $foreignParent = KnowledgeContext::query()->create([
            'vault_id' => $otherVault->getKey(),
            'parent_id' => null,
            'kind' => KnowledgeContext::KIND_UNIVERSE,
            'name' => 'Fora do escopo',
        ]);

        $this->postJson(route('cvc.contexts.store'), [
            'name' => 'Inválido',
            'parent_id' => $foreignParent->getKey(),
        ])->assertNotFound();
    }

    public function test_context_creation_rejects_a_blank_name(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        $this->postJson(route('cvc.contexts.store'), [
            'name' => '   ',
            'parent_id' => null,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertDatabaseCount('cvc_contexts', 2);
    }
}
