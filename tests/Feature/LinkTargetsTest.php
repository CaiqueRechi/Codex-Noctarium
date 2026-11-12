<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\Documents\CreateDocument;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class LinkTargetsTest extends TestCase
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

    public function testRf10OffersOnlyTitlesThatStartWithTheTypedText(): void
    {
        foreach (['Planta', 'Planeta', 'Plantera', 'Plancton', 'Placebo', 'Laranja', 'Foguete', 'Tangerina', 'Atlas dos planetas'] as $title) {
            $this->note($title);
        }

        $titles = $this->targets('pla')->pluck('title')->all();

        self::assertEqualsCanonicalizing(['Planta', 'Planeta', 'Plantera', 'Plancton', 'Placebo'], $titles);
    }

    public function testRf10IgnoresCaseAccentsAndLeadingSpaces(): void
    {
        $this->note('Árvore genealógica');
        $this->note('arvoredo');

        $titles = $this->targets('  ARVO')->pluck('title')->all();

        self::assertSame(['Árvore genealógica', 'arvoredo'], $titles);
    }

    public function testRf10OrdersByScoreThenAlphabeticallyAndKeepsFive(): void
    {
        $linked = $this->note('Prisma');
        $other = $this->note('Outro');
        $this->app->make(CreateRelation::class)->handle($linked->id, $other->id, null, null, false, []);

        foreach (['Pedra', 'Pena', 'Pera', 'Porta', 'Pires'] as $title) {
            $this->note($title);
        }

        $targets = $this->targets('p');

        self::assertSame(['Prisma', 'Pedra', 'Pena', 'Pera', 'Pires'], $targets->pluck('title')->all());
        self::assertSame(1, $targets->first()['score']);
    }

    public function testRf10LeavesOutTheNoteBeingWrittenAndTellsWhereEachNoteSits(): void
    {
        $self = $this->note('Planeta vermelho');
        $this->note('Planeta azul');

        $targets = $this->targets('planeta', $self->id);

        self::assertSame(['Planeta azul'], $targets->pluck('title')->all());
        self::assertSame(
            [$this->context->parent?->name, $this->context->name],
            $targets->first()['path'],
        );
    }

    public function testRf10RejectsAnEmptyPrefix(): void
    {
        $this->getJson(route('cvc.link-targets', ['prefix' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('prefix');
    }

    private function note(string $title): object
    {
        $document = $this->app->make(CreateDocument::class)->handle((string) $this->context->getKey());
        KnowledgeEntity::query()->whereKey($document->id)->update(['title' => $title]);

        return $document;
    }

    /** @return \Illuminate\Support\Collection<int, array<string, mixed>> */
    private function targets(string $prefix, ?string $except = null)
    {
        return collect($this->getJson(route('cvc.link-targets', array_filter([
            'prefix' => $prefix,
            'except' => $except,
        ])))->assertOk()->json('targets'));
    }
}
