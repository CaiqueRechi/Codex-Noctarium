<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Versions;

use CrowVaultCanvas\Application\Contexts\NoteSpaceHierarchy;
use CrowVaultCanvas\Domain\Knowledge\Content\NoteContent;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Domain\Knowledge\Models\SearchDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Domain\Knowledge\Models\VaultVersion;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use UnexpectedValueException;

final readonly class RestoreVaultVersion
{
    public function __construct(
        private CreateVaultVersion $createVersion,
        private SnapshotCodec $snapshotCodec,
        private MarkdownStorage $storage,
        private NoteSpaceHierarchy $hierarchy,
        private NoteContent $noteContent,
    ) {}

    public function handle(string $versionId, string $restoredBy): VersionRestoration
    {
        $restoration = DB::transaction(function () use ($versionId, $restoredBy): VersionRestoration {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $version = VaultVersion::query()
                ->whereKey($versionId)
                ->where('vault_id', $vaultId)
                ->lockForUpdate()
                ->firstOrFail();
            $snapshot = $version->snapshot;

            $this->validateSnapshot($version, $snapshot);
            $ownContents = $this->verifiedOwnContents($vaultId, $snapshot['entities']);
            $recoveryVersion = $this->createVersion->handle(
                (string) $version->perspective_id,
                Str::limit("Recuperação antes de restaurar {$version->name}", 120, ''),
                $restoredBy,
                VaultVersion::KIND_RECOVERY,
            );

            $this->restoreEntities($vaultId, $snapshot['entities'], $ownContents);
            $this->restoreMemberships($vaultId, $snapshot['context_entities']);
            $this->rejectSubnoteCycle();
            $this->restorePerspective($version, $snapshot['perspective']);
            $this->restoreRelations($vaultId, $snapshot['relations']);

            return new VersionRestoration($version, $recoveryVersion);
        }, 3);

        SearchDocument::query()
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->pluck('entity_id')
            ->merge(KnowledgeEntity::query()
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->pluck('id'))
            ->unique()
            ->each(fn (string $entityId) => IndexKnowledgeEntity::dispatchTracked($entityId));

        return $restoration;
    }

    /** @param array<string, mixed> $snapshot */
    private function validateSnapshot(VaultVersion $version, array $snapshot): void
    {
        if (! hash_equals($version->snapshot_hash, $this->snapshotCodec->hash($snapshot))) {
            throw new UnexpectedValueException('The vault version snapshot failed its integrity check.');
        }

        $validator = Validator::make($snapshot, [
            'schema_version' => ['required', 'integer', 'in:1'],
            'vault_id' => ['required', 'uuid'],
            'perspective' => ['required', 'array'],
            'perspective.id' => ['required', 'uuid'],
            'perspective.name' => ['required', 'string', 'max:120'],
            'perspective.source_perspective_id' => ['nullable', 'uuid'],
            'perspective.filters' => ['required', 'array:context_ids,entity_types'],
            'perspective.filters.context_ids' => ['present', 'array', 'max:50'],
            'perspective.filters.context_ids.*' => ['required', 'uuid', 'distinct'],
            'perspective.filters.entity_types' => ['present', 'array', 'max:20'],
            'perspective.filters.entity_types.*' => ['required', 'string', 'max:64', 'distinct'],
            'perspective.layouts' => ['present', 'array'],
            'perspective.layouts.*.context_id' => ['required', 'uuid'],
            'perspective.layouts.*.entity_id' => ['required', 'uuid'],
            'perspective.layouts.*.position_x' => ['nullable', 'numeric', 'between:-10000000,10000000'],
            'perspective.layouts.*.position_y' => ['nullable', 'numeric', 'between:-10000000,10000000'],
            'perspective.layouts.*.is_pinned' => ['required', 'boolean'],
            'entities' => ['present', 'array'],
            'entities.*.id' => ['required', 'uuid', 'distinct'],
            'entities.*.kind' => ['required', 'string', 'max:32'],
            'entities.*.title' => ['nullable', 'string', 'max:255'],
            'entities.*.entity_type' => ['nullable', 'string', 'max:64'],
            'entities.*.properties' => ['present', 'array'],
            'entities.*.tags' => ['sometimes', 'array'],
            'entities.*.tags.*' => ['required', 'string', 'max:64', 'distinct'],
            'entities.*.document' => ['nullable', 'array'],
            'entities.*.document.storage_path' => ['required_with:entities.*.document', 'string', 'max:512'],
            'entities.*.document.revision' => ['required_with:entities.*.document', 'integer', 'min:1'],
            'entities.*.document.content_hash' => ['required_with:entities.*.document', 'string', 'size:64'],
            'context_entities' => ['present', 'array'],
            'context_entities.*.context_id' => ['required', 'uuid'],
            'context_entities.*.entity_id' => ['required', 'uuid'],
            'context_entities.*.position_x' => ['nullable', 'numeric', 'between:-10000000,10000000'],
            'context_entities.*.position_y' => ['nullable', 'numeric', 'between:-10000000,10000000'],
            'context_entities.*.is_pinned' => ['required', 'boolean'],
            'relations' => ['present', 'array'],
            'relations.*.id' => ['required', 'uuid', 'distinct'],
            'relations.*.source_entity_id' => ['required', 'uuid'],
            'relations.*.target_entity_id' => ['required', 'uuid'],
            'relations.*.context_id' => ['nullable', 'uuid'],
            'relations.*.relation_type' => ['nullable', 'string', 'max:64'],
            'relations.*.is_directed' => ['required', 'boolean'],
            'relations.*.properties' => ['present', 'array'],
        ]);

        if ($validator->fails()) {
            throw new UnexpectedValueException('The vault version snapshot has an invalid structure.');
        }

        $vaultId = (string) config('crow-vault-canvas.vault.id');

        if ($snapshot['vault_id'] !== $vaultId || $snapshot['perspective']['id'] !== $version->perspective_id) {
            throw new UnexpectedValueException('The vault version snapshot belongs to another scope.');
        }

        $entityIds = collect($snapshot['entities'])->pluck('id');
        $referencesUnknownEntity = collect($snapshot['context_entities'])
            ->pluck('entity_id')
            ->merge(collect($snapshot['relations'])->pluck('source_entity_id'))
            ->merge(collect($snapshot['relations'])->pluck('target_entity_id'))
            ->contains(fn (string $entityId): bool => ! $entityIds->contains($entityId));

        if ($referencesUnknownEntity) {
            throw new UnexpectedValueException('The vault version snapshot references an unknown entity.');
        }

        $contextIds = collect($snapshot['context_entities'])
            ->pluck('context_id')
            ->merge(collect($snapshot['perspective']['layouts'])->pluck('context_id'))
            ->merge(collect($snapshot['relations'])->pluck('context_id')->filter())
            ->unique()
            ->values();
        $contextCount = KnowledgeContext::query()
            ->where('vault_id', $vaultId)
            ->whereKey($contextIds->all())
            ->count();

        if ($contextCount !== $contextIds->count()) {
            throw new UnexpectedValueException('The vault version snapshot references another vault context.');
        }
    }

    /**
     * @param  list<array<string, mixed>>  $entities
     * @return array<string, float> own content of each versioned document, by entity id
     */
    private function verifiedOwnContents(string $vaultId, array $entities): array
    {
        $ownContents = [];

        foreach ($entities as $entity) {
            if ($entity['document'] === null) {
                continue;
            }

            $content = $this->storage->read(
                $vaultId,
                $entity['id'],
                $entity['document']['storage_path'],
            );

            if (! hash_equals($entity['document']['content_hash'], hash('sha256', $content))) {
                throw new RuntimeException('A versioned Markdown revision failed its integrity check.');
            }

            $ownContents[$entity['id']] = $this->noteContent->measure($content);
        }

        return $ownContents;
    }

    /**
     * @param  list<array<string, mixed>>  $entities
     * @param  array<string, float>  $ownContents
     */
    private function restoreEntities(string $vaultId, array $entities, array $ownContents): void
    {
        $entityIds = collect($entities)->pluck('id')->all();
        $obsoleteQuery = KnowledgeEntity::query()->where('vault_id', $vaultId);

        if ($entityIds !== []) {
            $obsoleteQuery->whereNotIn('id', $entityIds);
        }

        $obsoleteIds = $obsoleteQuery->pluck('id');
        MarkdownDocument::query()->whereIn('entity_id', $obsoleteIds)->delete();
        KnowledgeEntity::query()->whereIn('id', $obsoleteIds)->increment('search_version');
        KnowledgeEntity::query()->whereIn('id', $obsoleteIds)->delete();

        foreach ($entities as $snapshotEntity) {
            $entity = KnowledgeEntity::withTrashed()
                ->whereKey($snapshotEntity['id'])
                ->where('vault_id', $vaultId)
                ->lockForUpdate()
                ->first();
            $attributes = [
                'vault_id' => $vaultId,
                'kind' => $snapshotEntity['kind'],
                'title' => $snapshotEntity['title'],
                'entity_type' => $snapshotEntity['entity_type'],
                'properties' => $snapshotEntity['properties'],
                'tags' => $snapshotEntity['tags'] ?? [],
            ];

            if ($entity === null) {
                $entity = KnowledgeEntity::query()->create([
                    'id' => $snapshotEntity['id'],
                    ...$attributes,
                ]);
            } else {
                $attributes['search_version'] = $entity->search_version + 1;
                $entity->fill($attributes)->save();
                $entity->restore();
            }

            $this->restoreDocument(
                $entity,
                $snapshotEntity['document'],
                $ownContents[$snapshotEntity['id']] ?? null,
            );
        }
    }

    /** @param array<string, mixed>|null $snapshotDocument */
    private function restoreDocument(KnowledgeEntity $entity, ?array $snapshotDocument, ?float $ownContent): void
    {
        $document = MarkdownDocument::withTrashed()->whereKey($entity->getKey())->first();

        if ($snapshotDocument === null) {
            $document?->delete();

            return;
        }

        $attributes = [
            'storage_path' => $snapshotDocument['storage_path'],
            'revision' => $snapshotDocument['revision'],
            'content_hash' => $snapshotDocument['content_hash'],
            'own_content' => $ownContent,
        ];

        if ($document === null) {
            MarkdownDocument::query()->create([
                'entity_id' => $entity->getKey(),
                ...$attributes,
            ]);

            return;
        }

        $document->fill($attributes)->save();
        $document->restore();
    }

    /** @param list<array<string, mixed>> $memberships */
    private function restoreMemberships(string $vaultId, array $memberships): void
    {
        $contextIds = KnowledgeContext::query()->where('vault_id', $vaultId)->pluck('id');
        DB::table('cvc_context_entity')->whereIn('context_id', $contextIds)->delete();
        $timestamp = now();
        $rows = collect($memberships)->map(fn (array $membership): array => [
            ...$membership,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ])->all();

        if ($rows !== []) {
            DB::table('cvc_context_entity')->insert($rows);
        }
    }

    // Context positions are not versioned, so memberships that were acyclic
    // when captured can close a cycle with where the contexts sit today.
    private function rejectSubnoteCycle(): void
    {
        if ($this->hierarchy->containsCycle()) {
            throw ValidationException::withMessages([
                'version' => 'Esta versão criaria um ciclo de subnotas com a organização atual dos assuntos.',
            ]);
        }
    }

    /** @param array<string, mixed> $snapshotPerspective */
    private function restorePerspective(VaultVersion $version, array $snapshotPerspective): void
    {
        $perspective = Perspective::query()
            ->whereKey($version->perspective_id)
            ->where('vault_id', $version->vault_id)
            ->firstOrFail();
        $perspective->update([
            'name' => $snapshotPerspective['name'],
            'source_perspective_id' => $snapshotPerspective['source_perspective_id'],
            'filters' => $snapshotPerspective['filters'],
        ]);
        DB::table('cvc_perspective_layouts')
            ->where('perspective_id', $perspective->getKey())
            ->delete();
        $timestamp = now();
        $rows = collect($snapshotPerspective['layouts'])->map(fn (array $layout): array => [
            'perspective_id' => $perspective->getKey(),
            ...$layout,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ])->all();

        if ($rows !== []) {
            DB::table('cvc_perspective_layouts')->insert($rows);
        }
    }

    /** @param list<array<string, mixed>> $relations */
    private function restoreRelations(string $vaultId, array $relations): void
    {
        KnowledgeRelation::withTrashed()
            ->where('vault_id', $vaultId)
            ->update(['cascade_deleted_by_entity_id' => null]);
        KnowledgeRelation::query()->where('vault_id', $vaultId)->delete();

        foreach ($relations as $snapshotRelation) {
            $relation = KnowledgeRelation::withTrashed()
                ->whereKey($snapshotRelation['id'])
                ->where('vault_id', $vaultId)
                ->first();
            $attributes = [
                'vault_id' => $vaultId,
                'source_entity_id' => $snapshotRelation['source_entity_id'],
                'target_entity_id' => $snapshotRelation['target_entity_id'],
                'context_id' => $snapshotRelation['context_id'],
                'relation_type' => $snapshotRelation['relation_type'],
                'is_directed' => $snapshotRelation['is_directed'],
                'properties' => $snapshotRelation['properties'],
                'cascade_deleted_by_entity_id' => null,
            ];

            if ($relation === null) {
                $relation = new KnowledgeRelation;
                $relation->setAttribute('id', $snapshotRelation['id']);
            }

            $relation->fill($attributes)->save();
            $relation->restore();
        }
    }
}
