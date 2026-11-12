<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

final class RenameEntityTest extends TestCase
{
    use RefreshDatabase;

    private KnowledgeContext $context;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->context = KnowledgeContext::query()
            ->where('kind', KnowledgeContext::KIND_CONTEXT)
            ->firstOrFail();
    }

    public function testRf02RenamesANoteWithoutTouchingItsContent(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());

        $this->patchJson(route('cvc.entities.title.update', $note->id), ['title' => '  Planeta vermelho  '])
            ->assertOk()
            ->assertJsonPath('entity.title', 'Planeta vermelho');

        $this->assertDatabaseHas('cvc_entities', ['id' => $note->id, 'title' => 'Planeta vermelho']);
        $this->assertDatabaseHas('cvc_documents', ['entity_id' => $note->id, 'revision' => 1]);
    }

    public function testRf02RefusesAnEmptyOrTooLongTitle(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());

        $this->patchJson(route('cvc.entities.title.update', $note->id), ['title' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->patchJson(route('cvc.entities.title.update', $note->id), ['title' => str_repeat('a', 121)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        self::assertNull(KnowledgeEntity::query()->findOrFail($note->id)->title);
    }

    public function testRf02DoesNotRenameANoteOutsideTheOpenVault(): void
    {
        $this->patchJson(route('cvc.entities.title.update', (string) Str::uuid()), ['title' => 'Intrusa'])
            ->assertNotFound();
    }

    public function testRf02KeepsTheNameOfAContextThatIsANoteInStepWithItsTitle(): void
    {
        $this->postJson(route('cvc.contexts.document.store', $this->context))->assertSuccessful();
        $ownerId = (string) $this->context->refresh()->noteSpace->entity_id;

        $this->patchJson(route('cvc.entities.title.update', $ownerId), ['title' => 'Contexto renomeado'])
            ->assertOk();

        self::assertSame('Contexto renomeado', $this->context->refresh()->name);
    }

    public function testRf02LeavesTheSpaceOfSubnotesOfAnOrdinaryNoteAlone(): void
    {
        $note = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());
        $space = $this->app->make(EnsureNoteSpace::class)->handle($note->id);

        $this->patchJson(route('cvc.entities.title.update', $note->id), ['title' => 'Com subnotas'])
            ->assertOk();

        self::assertSame('Subnotas', $space->refresh()->name);
    }
}
