<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;

final readonly class EntityDeletion
{
    /** @param list<string> $deletedRelationIds */
    public function __construct(
        public KnowledgeEntity $entity,
        public array $deletedRelationIds,
    ) {}
}
