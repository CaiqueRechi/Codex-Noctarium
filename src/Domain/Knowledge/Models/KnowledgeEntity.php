<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

final class KnowledgeEntity extends Model
{
    use HasUuids;
    use SoftDeletes;

    public const KIND_DOCUMENT = 'document';

    protected $table = 'cvc_entities';

    protected $fillable = [
        'id',
        'vault_id',
        'kind',
        'entity_type',
        'title',
        'properties',
        'tags',
        'search_version',
    ];

    protected function casts(): array
    {
        return [
            'properties' => 'array',
            'tags' => 'array',
            'search_version' => 'integer',
        ];
    }

    public function advanceSearchVersion(): void
    {
        $this->increment('search_version');
    }

    /** @return BelongsTo<Vault, $this> */
    public function vault(): BelongsTo
    {
        return $this->belongsTo(Vault::class);
    }

    /** @return BelongsToMany<KnowledgeContext, $this> */
    public function contexts(): BelongsToMany
    {
        return $this->belongsToMany(
            KnowledgeContext::class,
            'cvc_context_entity',
            'entity_id',
            'context_id',
        )->withPivot(['position_x', 'position_y', 'is_pinned'])
            ->withTimestamps();
    }

    /** @return HasOne<MarkdownDocument, $this> */
    public function document(): HasOne
    {
        return $this->hasOne(MarkdownDocument::class, 'entity_id');
    }

    /** @return HasMany<DocumentRevision, $this> */
    public function documentRevisions(): HasMany
    {
        return $this->hasMany(DocumentRevision::class, 'entity_id')
            ->orderBy('revision');
    }

    /** @return HasMany<Attachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'entity_id')->orderBy('created_at');
    }
}
