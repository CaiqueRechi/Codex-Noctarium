<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\Query\Builder;

final readonly class DescendantContent
{
    private const BATCH_SIZE = 200;

    public function __construct(private DatabaseManager $database, private Repository $config) {}

    /**
     * Sums the own content of every note beneath each context, counting a note
     * shared by several paths once per context.
     *
     * @param  list<string>  $contextIds
     * @return array<string, float> by context id
     */
    public function beneath(array $contextIds): array
    {
        $graph = $this->loadGraphBeneath($contextIds);
        $sums = [];

        foreach (array_unique($contextIds) as $contextId) {
            $sums[$contextId] = $this->sumBeneath($contextId, $graph);
        }

        return $sums;
    }

    /** @param array{children: array<string, list<string>>, members: array<string, list<string>>, owners: array<string, string>, spaces: array<string, string>, contents: array<string, float>} $graph */
    private function sumBeneath(string $rootId, array $graph): float
    {
        $pendingContexts = [$rootId];
        $visitedContexts = [];
        $countedNotes = [];

        while ($pendingContexts !== []) {
            $contextId = array_pop($pendingContexts);

            if (isset($visitedContexts[$contextId])) {
                continue;
            }

            $visitedContexts[$contextId] = true;
            $notes = $graph['members'][$contextId] ?? [];

            foreach ($graph['children'][$contextId] ?? [] as $childId) {
                $pendingContexts[] = $childId;

                if (isset($graph['owners'][$childId])) {
                    $notes[] = $graph['owners'][$childId];
                }
            }

            foreach ($notes as $noteId) {
                $countedNotes[$noteId] = true;

                if (isset($graph['spaces'][$noteId])) {
                    $pendingContexts[] = $graph['spaces'][$noteId];
                }
            }
        }

        return array_sum(array_intersect_key($graph['contents'], $countedNotes));
    }

    /**
     * @param  list<string>  $rootIds
     * @return array{children: array<string, list<string>>, members: array<string, list<string>>, owners: array<string, string>, spaces: array<string, string>, contents: array<string, float>}
     */
    private function loadGraphBeneath(array $rootIds): array
    {
        $graph = ['children' => [], 'members' => [], 'owners' => [], 'spaces' => [], 'contents' => []];
        $pending = array_values(array_unique($rootIds));
        $loaded = [];

        while ($pending !== []) {
            $batch = array_values(array_filter(
                array_splice($pending, 0, self::BATCH_SIZE),
                fn (string $contextId): bool => ! isset($loaded[$contextId]),
            ));

            if ($batch === []) {
                continue;
            }

            $loaded += array_fill_keys($batch, true);

            foreach ($this->childContexts($batch) as $child) {
                $graph['children'][$child->parent_id][] = $child->id;
                $pending[] = $child->id;
            }

            foreach ($this->notesIn($batch) as $note) {
                $graph['members'][$note->context_id][] = $note->entity_id;
                $graph['contents'][$note->entity_id] = (float) $note->own_content;

                if ($note->space_id !== null) {
                    $graph['spaces'][$note->entity_id] = $note->space_id;
                    $pending[] = $note->space_id;
                }
            }
        }

        foreach (array_chunk(array_keys($loaded), self::BATCH_SIZE) as $contextIds) {
            foreach ($this->ownersOf($contextIds) as $owner) {
                $graph['owners'][$owner->context_id] = $owner->entity_id;
                $graph['contents'][$owner->entity_id] = (float) $owner->own_content;
            }
        }

        return $graph;
    }

    /**
     * @param  list<string>  $parentIds
     * @return iterable<object{id: string, parent_id: string}>
     */
    private function childContexts(array $parentIds): iterable
    {
        return $this->database->table('cvc_contexts')
            ->where('vault_id', $this->vaultId())
            ->whereIn('parent_id', $parentIds)
            ->whereNull('deleted_at')
            ->get(['id', 'parent_id']);
    }

    /**
     * @param  list<string>  $contextIds
     * @return iterable<object{context_id: string, entity_id: string, own_content: float|null, space_id: string|null}>
     */
    private function notesIn(array $contextIds): iterable
    {
        return $this->activeNotes()
            ->join('cvc_context_entity', 'cvc_context_entity.entity_id', '=', 'cvc_entities.id')
            ->leftJoin('cvc_note_spaces', 'cvc_note_spaces.entity_id', '=', 'cvc_entities.id')
            ->leftJoin('cvc_contexts as spaces', function ($join): void {
                $join->on('spaces.id', '=', 'cvc_note_spaces.context_id')
                    ->where('spaces.vault_id', $this->vaultId())
                    ->whereNull('spaces.deleted_at');
            })
            ->whereIn('cvc_context_entity.context_id', $contextIds)
            ->get([
                'cvc_context_entity.context_id',
                'cvc_entities.id as entity_id',
                'cvc_documents.own_content',
                'spaces.id as space_id',
            ]);
    }

    /**
     * @param  list<string>  $contextIds
     * @return iterable<object{context_id: string, entity_id: string, own_content: float|null}>
     */
    private function ownersOf(array $contextIds): iterable
    {
        return $this->activeNotes()
            ->join('cvc_note_spaces', 'cvc_note_spaces.entity_id', '=', 'cvc_entities.id')
            ->whereIn('cvc_note_spaces.context_id', $contextIds)
            ->get(['cvc_note_spaces.context_id', 'cvc_entities.id as entity_id', 'cvc_documents.own_content']);
    }

    private function activeNotes(): Builder
    {
        return $this->database->table('cvc_entities')
            ->join('cvc_documents', function ($join): void {
                $join->on('cvc_documents.entity_id', '=', 'cvc_entities.id')
                    ->whereNull('cvc_documents.deleted_at');
            })
            ->where('cvc_entities.vault_id', $this->vaultId())
            ->where('cvc_entities.kind', KnowledgeEntity::KIND_DOCUMENT)
            ->whereNull('cvc_entities.deleted_at');
    }

    private function vaultId(): string
    {
        return (string) $this->config->get('crow-vault-canvas.vault.id');
    }
}
