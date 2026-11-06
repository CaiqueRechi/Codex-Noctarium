<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

final class MarkdownDocument extends Model
{
    use SoftDeletes;

    protected $table = 'cvc_documents';

    protected $primaryKey = 'entity_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'entity_id',
        'storage_path',
        'revision',
        'content_hash',
        'current_revision_id',
    ];

    protected function casts(): array
    {
        return [
            'revision' => 'integer',
        ];
    }

    /** @return BelongsTo<KnowledgeEntity, $this> */
    public function entity(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class, 'entity_id');
    }

    /** @return BelongsTo<DocumentRevision, $this> */
    public function currentRevision(): BelongsTo
    {
        return $this->belongsTo(DocumentRevision::class, 'current_revision_id');
    }
}
