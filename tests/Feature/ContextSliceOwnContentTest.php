<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Application\Contexts\EnsureContextDocument;
use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class ContextSliceOwnContentTest extends TestCase
{
    use RefreshDatabase;

    private const TOLERANCE = 1e-12;

    public function testRf03TheSliceCarriesTheMeasureOfEachNoteWithoutItsBody(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        $this->app->make(SaveDocument::class)->handle($note->id, '**Olá**', 1);

        $response = $this->getJson(route('cvc.contexts.show', $context))->assertOk();

        self::assertEqualsWithDelta(5.4, $response->json('slice.contexts.0.documents.0.ownContent'), self::TOLERANCE);
        self::assertArrayNotHasKey('content', $response->json('slice.contexts.0.documents.0'));
    }

    public function testRf03AContextThatIsANoteCarriesTheMeasureOfItsOwnContent(): void
    {
        $context = $this->initializeContext();
        $legacy = $this->app->make(CreateContext::class)->handle('Legado', (string) $context->getKey());
        $owner = $this->app->make(EnsureContextDocument::class)->handle((string) $legacy->getKey());
        $this->app->make(SaveDocument::class)->handle($owner->id, 'Olá, ç1!', $owner->revision);

        $response = $this->getJson(route('cvc.contexts.show', $context))->assertOk();

        self::assertNull($response->json('slice.contexts.0.ownContent'));
        self::assertSame($owner->id, $response->json('slice.contexts.0.contexts.0.ownerEntityId'));
        self::assertEqualsWithDelta(7.0, $response->json('slice.contexts.0.contexts.0.ownContent'), self::TOLERANCE);
    }

    public function testRf03ANoteNotMeasuredYetIsReportedAsUnknownInsteadOfEmpty(): void
    {
        $context = $this->initializeContext();
        $note = $this->app->make(CreateDocument::class)->handle((string) $context->getKey());
        MarkdownDocument::query()->whereKey($note->id)->update(['own_content' => null]);

        $response = $this->getJson(route('cvc.contexts.show', $context))->assertOk();

        self::assertArrayHasKey('ownContent', $response->json('slice.contexts.0.documents.0'));
        self::assertNull($response->json('slice.contexts.0.documents.0.ownContent'));
    }

    private function initializeContext(): KnowledgeContext
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        return KnowledgeContext::query()->where('kind', KnowledgeContext::KIND_CONTEXT)->firstOrFail();
    }
}
