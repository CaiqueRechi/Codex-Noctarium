<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\AttachEntityToContext;
use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Application\Contexts\EnsureContextDocument;
use CrowVaultCanvas\Application\Contexts\EnsureNoteSpace;
use CrowVaultCanvas\Application\Contexts\UpdateContext;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\OpenDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Versions\CreateVaultVersion;
use CrowVaultCanvas\Application\Versions\RestoreVaultVersion;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\NoteSpace;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Domain\Knowledge\Models\VaultVersion;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Auth\GenericUser;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class NoteSpaceVersionTest extends TestCase
{
    use RefreshDatabase;

    private const USER_ID = '42';

    public function testRf03RejectsAnOlderMembershipSnapshotThatWouldCreateACycleWithCurrentContextPositions(): void
    {
        $root = $this->initializeContext();
        $contextA = $this->app->make(CreateContext::class)->handle('A', (string) $root->getKey());
        $noteB = $this->app->make(CreateDocument::class)->handle((string) $root->getKey());
        $spaceOfB = $this->app->make(EnsureNoteSpace::class)->handle($noteB->id);
        $withoutMembership = $this->captureVersion('V0');
        $this->app->make(AttachEntityToContext::class)->handle((string) $contextA->getKey(), $noteB->id);
        $withMembership = $this->captureVersion('V1');
        $restore = $this->app->make(RestoreVaultVersion::class);
        $restore->handle((string) $withoutMembership->getKey(), self::USER_ID);
        $this->app->make(UpdateContext::class)->handle((string) $contextA->getKey(), 'A', (string) $spaceOfB->getKey());
        $versionsBeforeRejection = VaultVersion::query()->count();
        $this->actingAs(new GenericUser(['id' => self::USER_ID]));

        $this->postJson(route('cvc.versions.restore', $withMembership))
            ->assertUnprocessable()->assertJsonValidationErrors('version');

        $this->assertDatabaseMissing('cvc_context_entity', [
            'context_id' => $contextA->getKey(),
            'entity_id' => $noteB->id,
        ]);
        self::assertSame((string) $spaceOfB->getKey(), $contextA->fresh()->parent_id);
        self::assertSame($versionsBeforeRejection, VaultVersion::query()->count());
    }

    public function testRf02RestoringLegacyContextContentKeepsTheOwnedSpaceIdentity(): void
    {
        $root = $this->initializeContext();
        $legacy = $this->app->make(CreateContext::class)->handle('Legado', (string) $root->getKey());
        $owner = $this->app->make(EnsureContextDocument::class)->handle((string) $legacy->getKey());
        $save = $this->app->make(SaveDocument::class);
        $original = $save->handle($owner->id, 'Conteúdo original.', $owner->revision);
        $version = $this->captureVersion('Antes da edição');
        $save->handle($owner->id, 'Conteúdo substituído.', $original->revision);

        $this->app->make(RestoreVaultVersion::class)->handle((string) $version->getKey(), self::USER_ID);

        $restored = $this->app->make(OpenDocument::class)->handle($owner->id);
        self::assertSame('Conteúdo original.', $restored->content);
        self::assertSame((string) $legacy->getKey(), $restored->spaceId);
        self::assertSame(
            (string) $legacy->getKey(),
            NoteSpace::query()->whereKey($owner->id)->value('context_id'),
        );
        $this->assertDatabaseCount('cvc_note_spaces', 1);
    }

    private function initializeContext(): KnowledgeContext
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        return KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }

    private function captureVersion(string $name): VaultVersion
    {
        return $this->app->make(CreateVaultVersion::class)->handle(
            (string) Perspective::query()->firstOrFail()->getKey(),
            $name,
            self::USER_ID,
        );
    }
}
