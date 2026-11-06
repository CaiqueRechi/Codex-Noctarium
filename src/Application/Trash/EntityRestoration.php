<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Trash;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use Illuminate\Support\Collection;

final readonly class EntityRestoration
{
    /**
     * @param  Collection<int, KnowledgeRelation>  $restoredRelations
     * @param  list<array{id: string, missingEntityIds: list<string>}>  $brokenRelations
     */
    public function __construct(
        public KnowledgeEntity $entity,
        public Collection $restoredRelations,
        public array $brokenRelations,
    ) {}
}
