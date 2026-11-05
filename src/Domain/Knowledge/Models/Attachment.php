<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Attachment extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'cvc_attachments';

    protected $fillable = [
        'id',
        'vault_id',
        'entity_id',
        'original_name',
        'mime_type',
        'size_bytes',
        'content_hash',
        'storage_path',
    ];

    protected function casts(): array
    {
        return ['size_bytes' => 'integer'];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class, 'entity_id');
    }
}
