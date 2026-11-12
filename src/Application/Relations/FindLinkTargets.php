<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Relations;

use CrowVaultCanvas\Application\Contexts\ContextPath;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * RF-10: the notes a "/link" command may connect to. Only titles that
 * start with the typed text qualify (D-09: ignoring case, accents and
 * leading spaces); they are ordered by score, then alphabetically, and at
 * most five are returned.
 */
final readonly class FindLinkTargets
{
    public const LIMIT = 5;

    public function __construct(private Repository $config, private ContextPath $contextPath) {}

    /** @return list<array{id: string, title: string, path: list<string>, score: int}> */
    public function handle(string $prefix, ?string $exceptEntityId): array
    {
        $wanted = $this->normalize($prefix);

        if ($wanted === '') {
            return [];
        }

        $candidates = KnowledgeEntity::query()
            ->where('vault_id', $this->vaultId())
            ->where('kind', KnowledgeEntity::KIND_DOCUMENT)
            ->whereNotNull('title')
            ->when($exceptEntityId !== null, fn ($query) => $query->whereKeyNot($exceptEntityId))
            ->get(['id', 'title', 'access_count', 'search_count'])
            ->filter(fn (KnowledgeEntity $entity): bool => str_starts_with(
                $this->normalize((string) $entity->title),
                $wanted,
            ));
        $scores = $this->scores($candidates);

        return $candidates
            ->sort(fn (KnowledgeEntity $a, KnowledgeEntity $b): int => [
                $scores[(string) $b->getKey()] ?? 0,
                $this->normalize((string) $a->title),
            ] <=> [
                $scores[(string) $a->getKey()] ?? 0,
                $this->normalize((string) $b->title),
            ])
            ->take(self::LIMIT)
            ->map(fn (KnowledgeEntity $entity): array => [
                'id' => (string) $entity->getKey(),
                'title' => (string) $entity->title,
                'path' => array_column($this->contextPath->toEntity($entity), 'name'),
                'score' => $scores[(string) $entity->getKey()] ?? 0,
            ])
            ->values()
            ->all();
    }

    private function normalize(string $text): string
    {
        return Str::lower(Str::ascii(ltrim($text)));
    }

    /**
     * S = accesses + searches + links (D-09), each with weight one.
     *
     * @param  Collection<int, KnowledgeEntity>  $candidates
     * @return array<string, int>
     */
    private function scores(Collection $candidates): array
    {
        if ($candidates->isEmpty()) {
            return [];
        }

        $entityIds = $candidates->map(fn (KnowledgeEntity $entity): string => (string) $entity->getKey());
        $scores = $candidates
            ->mapWithKeys(fn (KnowledgeEntity $entity): array => [
                (string) $entity->getKey() => (int) $entity->access_count + (int) $entity->search_count,
            ])
            ->all();
        $relations = KnowledgeRelation::query()
            ->where('vault_id', $this->vaultId())
            ->where(fn ($query) => $query
                ->whereIn('source_entity_id', $entityIds->all())
                ->orWhereIn('target_entity_id', $entityIds->all()))
            ->get(['source_entity_id', 'target_entity_id']);

        foreach ($relations as $relation) {
            foreach ([$relation->source_entity_id, $relation->target_entity_id] as $endpoint) {
                $scores[$endpoint] = ($scores[$endpoint] ?? 0) + 1;
            }
        }

        return $scores;
    }

    private function vaultId(): string
    {
        return (string) $this->config->get('crow-vault-canvas.vault.id');
    }
}
