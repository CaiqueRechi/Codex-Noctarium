<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use UnexpectedValueException;

final class OpenContextSlice
{
    public function __construct(
        private readonly RequireAvailableContext $requireAvailableContext,
        private readonly DescendantContent $descendantContent,
    ) {}

    public function handle(?string $focusContextId = null): ContextSlice
    {
        if ($focusContextId === null) {
            return $this->measured(
                $this->sliceQuery()->whereNull('parent_id')
                    ->where('kind', '!=', KnowledgeContext::KIND_NOTE_SPACE)->get(),
                collect(),
            );
        }

        $focus = $this->sliceQuery()->findOrFail($focusContextId);
        $this->requireAvailableContext->handle($focus);

        return $this->measured(collect([$focus]), $this->breadcrumbs($focus));
    }

    /**
     * @param  Collection<int, KnowledgeContext>  $contexts
     * @param  Collection<int, KnowledgeContext>  $breadcrumbs
     */
    private function measured(Collection $contexts, Collection $breadcrumbs): ContextSlice
    {
        $shown = $contexts->concat($contexts->flatMap->children);
        $containers = $shown->map->getKey()
            ->concat($shown->flatMap->entities->map(fn ($entity) => $entity->noteSpace?->context_id))
            ->filter()->unique()->values()->all();

        return new ContextSlice($contexts, $breadcrumbs, $this->descendantContent->beneath($containers));
    }

    /** @return Builder<KnowledgeContext> */
    private function sliceQuery(): Builder
    {
        return KnowledgeContext::query()
            ->where('vault_id', $this->vaultId())
            ->withCount('children')
            ->with([
                'entities' => fn ($query) => $query->withCount('contexts'),
                'entities.document',
                'entities.attachments',
                'entities.noteSpace',
                'noteSpace.entity.document',
                'children' => fn ($query) => $query
                    ->withCount('children')
                    ->with([
                        'entities' => fn ($query) => $query->withCount('contexts'),
                        'entities.document',
                        'entities.attachments',
                        'entities.noteSpace',
                        'noteSpace.entity.document',
                    ]),
            ])
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    /** @return Collection<int, KnowledgeContext> */
    private function breadcrumbs(KnowledgeContext $focus): Collection
    {
        $breadcrumbs = collect();
        $seen = [];
        $current = $focus;

        while ($current !== null) {
            $currentId = (string) $current->getKey();

            if (isset($seen[$currentId])) {
                throw new UnexpectedValueException('The context hierarchy contains a cycle.');
            }

            $seen[$currentId] = true;
            $breadcrumbs->prepend($current);

            if ($current->parent_id === null) {
                break;
            }

            $current = KnowledgeContext::query()
                ->where('vault_id', $this->vaultId())
                ->with('noteSpace.entity')
                ->findOrFail($current->parent_id);
        }

        return $breadcrumbs->values();
    }

    private function vaultId(): string
    {
        return (string) config('crow-vault-canvas.vault.id');
    }
}
