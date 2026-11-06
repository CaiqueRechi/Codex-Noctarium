<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DocumentRevision extends Model
{
    use HasUuids;

    protected $table = 'cvc_document_revisions';

    protected $fillable = [
        'id',
        'entity_id',
        'revision',
        'format',
        'content',
        'metadata',
        'content_hash',
        'content_bytes',
    ];

    protected function casts(): array
    {
        return [
            'revision' => 'integer',
            'metadata' => 'array',
            'content_bytes' => 'integer',
        ];
    }

    /** @return BelongsTo<KnowledgeEntity, $this> */
    public function entity(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class, 'entity_id');
    }
}
