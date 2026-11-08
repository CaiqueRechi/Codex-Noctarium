<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class ContextMovementTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_context_can_be_renamed_and_moved_without_changing_its_identity(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $this->patchJson(route('cvc.contexts.update', $context), ['name' => 'Renomeado', 'parent_id' => null])
            ->assertOk()->assertJsonPath('context.id', $context->getKey())
            ->assertJsonPath('context.name', 'Renomeado')->assertJsonPath('context.kind', 'universe');
        self::assertNull($context->fresh()->parent_id);
    }

    public function test_moving_a_context_below_its_descendant_is_rejected(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $parent = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
        $child = $this->app->make(CreateContext::class)->handle('Filho', (string) $parent->getKey());
        $originalParent = $parent->parent_id;
        $this->patchJson(route('cvc.contexts.update', $parent), ['name' => 'Inválido', 'parent_id' => $child->getKey()])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');
        self::assertSame($originalParent, $parent->fresh()->parent_id);
    }

    public function test_a_parent_from_another_vault_cannot_receive_a_context(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $context = KnowledgeContext::query()->firstOrFail();
        $otherVault = Vault::query()->create(['name' => 'Outro']);
        $other = $otherVault->contexts()->create(['name' => 'Outro', 'kind' => 'universe']);
        $this->patchJson(route('cvc.contexts.update', $context), ['name' => 'Inválido', 'parent_id' => $other->getKey()])
            ->assertNotFound();
    }
}
