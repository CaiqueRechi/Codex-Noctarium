<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use Illuminate\Support\Collection;

final readonly class ContextSlice
{
    /**
     * @param  Collection<int, KnowledgeContext>  $contexts
     * @param  Collection<int, KnowledgeContext>  $breadcrumbs
     */
    public function __construct(
        public Collection $contexts,
        public Collection $breadcrumbs,
    ) {}
}
