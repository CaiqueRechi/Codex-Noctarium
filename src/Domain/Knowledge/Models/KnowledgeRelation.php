<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

final class KnowledgeRelation extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'cvc_relations';

    protected $fillable = [
        'vault_id',
        'source_entity_id',
        'target_entity_id',
        'context_id',
        'relation_type',
        'is_directed',
        'properties',
    ];

    protected function casts(): array
    {
        return [
            'is_directed' => 'boolean',
            'properties' => 'array',
        ];
    }

    public function vault(): BelongsTo
    {
        return $this->belongsTo(Vault::class);
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class, 'source_entity_id');
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class, 'target_entity_id');
    }

    public function context(): BelongsTo
    {
        return $this->belongsTo(KnowledgeContext::class);
    }
}
