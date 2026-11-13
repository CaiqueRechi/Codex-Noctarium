<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Application\Trash\PurgeTrash;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;

final class PurgeTrashTest extends TestCase
{
    use RefreshDatabase;

    private KnowledgeContext $context;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->context = KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }

    public function testD13DeletesForGoodWhatStayedSevenDaysInTheTrash(): void
    {
        $expired = $this->note($this->context);
        $recent = $this->note($this->context);
        $this->app->make(CreateRelation::class)->handle($expired, $recent, null, null, false, []);
        $root = (string) config('crow-vault-canvas.storage.root');
        $directory = $root.'/vaults/'.config('crow-vault-canvas.vault.id').'/entities/'.$expired;
        self::assertDirectoryExists($directory);

        Carbon::setTestNow(Carbon::now()->subDays(8));
        $this->deleteJson(route('cvc.entities.destroy', $expired))->assertOk();
        Carbon::setTestNow(Carbon::now()->addDays(2));
        $this->deleteJson(route('cvc.entities.destroy', $recent))->assertOk();
        Carbon::setTestNow();

        $purged = $this->app->make(PurgeTrash::class)->handle();

        self::assertSame([$expired], $purged);
        self::assertNull(KnowledgeEntity::withTrashed()->find($expired));
        self::assertNotNull(KnowledgeEntity::withTrashed()->find($recent));
        self::assertSame(0, KnowledgeRelation::withTrashed()->count());
        self::assertFalse(File::isDirectory($directory));
        $this->assertDatabaseMissing('cvc_documents', ['entity_id' => $expired]);
    }

    public function testD13PurgeIsACommandOfThePackage(): void
    {
        $this->artisan('cvc:purge-trash')->assertSuccessful();
    }

    private function note(KnowledgeContext $context): string
    {
        return $this->app->make(CreateDocument::class)->handle((string) $context->getKey())->id;
    }
}
