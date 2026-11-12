<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

use Illuminate\Database\DatabaseManager;

/**
 * D-13: deleting a note that has subnotes asks first. Without the answer
 * nothing is deleted and the number of subnotes is returned; with it, the
 * note and every subnote that does not also live elsewhere go to the trash
 * together.
 */
final readonly class TrashNoteWithSubnotes
{
    public function __construct(
        private DatabaseManager $database,
        private SubnoteTree $subnoteTree,
        private DeleteEntity $deleteEntity,
    ) {}

    public function handle(string $entityId, bool $withSubnotes): NoteTrashing
    {
        $tree = $this->subnoteTree->beneath($entityId);

        if ($tree['notes'] !== [] && ! $withSubnotes) {
            return NoteTrashing::refused(count($tree['notes']));
        }

        return $this->database->transaction(function () use ($entityId, $tree): NoteTrashing {
            $deletion = $this->deleteEntity->handle($entityId);
            $trashedSubnotes = [];

            foreach ($tree['notes'] as $noteId) {
                if ($this->subnoteTree->livesOutside($noteId, $tree['containers'])) {
                    continue;
                }

                $this->deleteEntity->handle($noteId);
                $trashedSubnotes[] = $noteId;
            }

            return NoteTrashing::done($deletion, $trashedSubnotes);
        }, 3);
    }
}
