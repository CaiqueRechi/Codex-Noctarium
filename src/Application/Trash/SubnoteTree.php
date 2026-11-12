<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\NoteSpace;
use Illuminate\Database\DatabaseManager;

/**
 * Everything beneath a note: the spaces inside it (its own, the spaces of
 * its subnotes, nested contexts) and the notes those spaces hold. Each is
 * listed once, however many ways lead to it.
 */
final readonly class SubnoteTree
{
    public function __construct(private DatabaseManager $database) {}

    /** @return array{containers: list<string>, notes: list<string>} */
    public function beneath(string $entityId): array
    {
        $containers = [];
        $notes = [];
        $pending = array_filter([$this->spaceOf($entityId)]);

        while ($pending !== []) {
            $containerId = array_pop($pending);

            if (isset($containers[$containerId])) {
                continue;
            }

            $containers[$containerId] = true;
            $pending = [...$pending, ...$this->childContexts($containerId)];

            foreach ($this->notesIn($containerId) as $noteId) {
                if ($noteId === $entityId || isset($notes[$noteId])) {
                    continue;
                }

                $notes[$noteId] = true;
                $space = $this->spaceOf($noteId);

                if ($space !== null) {
                    $pending[] = $space;
                }
            }
        }

        return ['containers' => array_keys($containers), 'notes' => array_keys($notes)];
    }

    /**
     * D-13: a subnote that also appears in a space outside the tree stays
     * alive there when the tree goes to the trash.
     *
     * @param  list<string>  $containers
     */
    public function livesOutside(string $noteId, array $containers): bool
    {
        return $this->database->table('cvc_context_entity')
            ->join('cvc_contexts', 'cvc_contexts.id', '=', 'cvc_context_entity.context_id')
            ->where('cvc_context_entity.entity_id', $noteId)
            ->whereNull('cvc_contexts.deleted_at')
            ->whereNotIn('cvc_context_entity.context_id', $containers)
            ->exists();
    }

    private function spaceOf(string $entityId): ?string
    {
        $contextId = NoteSpace::query()->whereKey($entityId)->value('context_id');

        return $contextId === null ? null : (string) $contextId;
    }

    /** @return list<string> */
    private function childContexts(string $contextId): array
    {
        return $this->database->table('cvc_contexts')
            ->where('parent_id', $contextId)
            ->whereNull('deleted_at')
            ->pluck('id')
            ->map(fn ($id): string => (string) $id)
            ->all();
    }

    /** @return list<string> */
    private function notesIn(string $contextId): array
    {
        return $this->database->table('cvc_context_entity')
            ->join('cvc_entities', 'cvc_entities.id', '=', 'cvc_context_entity.entity_id')
            ->where('cvc_context_entity.context_id', $contextId)
            ->where('cvc_entities.kind', KnowledgeEntity::KIND_DOCUMENT)
            ->whereNull('cvc_entities.deleted_at')
            ->pluck('cvc_entities.id')
            ->map(fn ($id): string => (string) $id)
            ->all();
    }
}
