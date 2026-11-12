<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

final readonly class NoteTrashing
{
    /** @param list<string> $trashedSubnoteIds */
    private function __construct(
        public ?EntityDeletion $deletion,
        public int $pendingSubnotes,
        public array $trashedSubnoteIds,
    ) {}

    public static function refused(int $subnotes): self
    {
        return new self(null, $subnotes, []);
    }

    /** @param list<string> $trashedSubnoteIds */
    public static function done(EntityDeletion $deletion, array $trashedSubnoteIds): self
    {
        return new self($deletion, 0, $trashedSubnoteIds);
    }
}
