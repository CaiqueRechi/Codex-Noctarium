<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;

/**
 * The way from a universe down to a context, for showing where something
 * sits. A space of subnotes has no parent, because its note may sit in
 * several spaces; the path goes on through the first space that note was
 * placed in. A cycle or a very deep hierarchy ends the walk instead of
 * looping.
 */
final readonly class ContextPath
{
    private const MAXIMUM_DEPTH = 64;

    /** @return list<array{id: string, name: string}> */
    public function to(?KnowledgeContext $context): array
    {
        $path = [];
        $visited = [];

        while ($context !== null && count($path) < self::MAXIMUM_DEPTH && ! isset($visited[$context->getKey()])) {
            $visited[$context->getKey()] = true;
            $owner = $context->noteSpace?->entity;
            array_unshift($path, [
                'id' => (string) $context->getKey(),
                'name' => $owner?->title ?? $context->name,
            ]);
            $context = $this->above($context, $owner);
        }

        return $path;
    }

    /** @return list<array{id: string, name: string}> */
    public function toEntity(KnowledgeEntity $entity): array
    {
        return $this->to($this->firstPlaceOf($entity));
    }

    private function above(KnowledgeContext $context, ?KnowledgeEntity $owner): ?KnowledgeContext
    {
        if ($context->parent_id !== null) {
            return KnowledgeContext::query()->with('noteSpace.entity')->find($context->parent_id);
        }

        return $owner !== null && $context->kind === KnowledgeContext::KIND_NOTE_SPACE
            ? $this->firstPlaceOf($owner)
            : null;
    }

    private function firstPlaceOf(KnowledgeEntity $entity): ?KnowledgeContext
    {
        return $entity->contexts()
            ->with('noteSpace.entity')
            ->orderBy('cvc_context_entity.created_at')
            ->first();
    }
}
