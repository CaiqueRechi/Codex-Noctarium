<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class NoteSpace extends Model
{
    protected $table = 'cvc_note_spaces';

    protected $primaryKey = 'entity_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['entity_id', 'context_id'];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class, 'entity_id');
    }

    public function context(): BelongsTo
    {
        return $this->belongsTo(KnowledgeContext::class, 'context_id');
    }
}
