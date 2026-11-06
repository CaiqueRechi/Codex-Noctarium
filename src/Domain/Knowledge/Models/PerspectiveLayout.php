<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class PerspectiveLayout extends Model
{
    protected $table = 'cvc_perspective_layouts';

    public $incrementing = false;

    protected $fillable = [
        'perspective_id',
        'context_id',
        'entity_id',
        'position_x',
        'position_y',
        'is_pinned',
    ];

    protected function casts(): array
    {
        return [
            'position_x' => 'float',
            'position_y' => 'float',
            'is_pinned' => 'boolean',
        ];
    }

    /** @return BelongsTo<Perspective, $this> */
    public function perspective(): BelongsTo
    {
        return $this->belongsTo(Perspective::class);
    }

    /** @return BelongsTo<KnowledgeContext, $this> */
    public function context(): BelongsTo
    {
        return $this->belongsTo(KnowledgeContext::class);
    }

    /** @return BelongsTo<KnowledgeEntity, $this> */
    public function entity(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class);
    }
}
