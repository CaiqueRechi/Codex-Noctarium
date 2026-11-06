<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Search;

use CrowVaultCanvas\Domain\Knowledge\Models\SearchDocument;
use Illuminate\Support\Facades\DB;

final class SearchVault
{
    /** @return list<array{id: string, contextId: string, title: string|null, snippet: string, entityType: string|null, tags: list<string>}> */
    public function handle(
        string $query,
        ?string $contextId,
        ?string $entityType,
        ?string $tag,
    ): array {
        $vaultId = (string) config('crow-vault-canvas.vault.id');
        $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $query).'%';
        $results = SearchDocument::query()
            ->select('cvc_search_index.*')
            ->addSelect([
                'context_id' => DB::table('cvc_context_entity')
                    ->select('context_id')
                    ->whereColumn('entity_id', 'cvc_search_index.entity_id')
                    ->orderBy('context_id')
                    ->limit(1),
            ])
            ->join('cvc_entities', 'cvc_entities.id', '=', 'cvc_search_index.entity_id')
            ->join('cvc_documents', 'cvc_documents.entity_id', '=', 'cvc_search_index.entity_id')
            ->where('cvc_search_index.vault_id', $vaultId)
            ->whereNull('cvc_entities.deleted_at')
            ->whereNull('cvc_documents.deleted_at')
            ->whereColumn('cvc_search_index.content_hash', 'cvc_documents.content_hash')
            ->when($contextId !== null, fn ($builder) => $builder->whereIn(
                'cvc_search_index.entity_id',
                DB::table('cvc_context_entity')->select('entity_id')->where('context_id', $contextId),
            ))
            ->when(
                $entityType !== null,
                fn ($builder) => $builder->where('cvc_search_index.entity_type', $entityType),
            )
            ->when($tag !== null, fn ($builder) => $builder->whereJsonContains('cvc_search_index.tags', $tag))
            ->where(function ($builder) use ($pattern, $query): void {
                foreach (['title', 'content', 'entity_type', 'properties', 'contexts', 'relations'] as $column) {
                    $builder->orWhereRaw("cvc_search_index.{$column} LIKE ? ESCAPE '!'", [$pattern]);
                }

                $builder->orWhereJsonContains('cvc_search_index.tags', $query);
            })
            ->orderBy('cvc_search_index.title')
            ->limit(50)
            ->get();

        return $results->map(fn (SearchDocument $result): array => [
            'id' => (string) $result->getKey(),
            'contextId' => (string) $result->getAttribute('context_id'),
            'title' => $result->title,
            'snippet' => $this->snippet($result->content, $query),
            'entityType' => $result->entity_type,
            'tags' => array_values($result->tags ?? []),
        ])->values()->all();
    }

    private function snippet(string $content, string $query): string
    {
        $position = mb_stripos($content, $query);

        if ($position === false) {
            return mb_substr($content, 0, 180);
        }

        return mb_substr($content, max(0, $position - 60), 180);
    }
}
