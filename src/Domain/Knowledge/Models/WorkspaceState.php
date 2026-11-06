<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class WorkspaceState extends Model
{
    protected $table = 'cvc_workspace_states';

    protected $fillable = [
        'vault_id',
        'user_id',
        'viewport_x',
        'viewport_y',
        'viewport_zoom',
        'focus_entity_id',
        'focus_context_id',
        'perspective_id',
    ];

    protected function casts(): array
    {
        return [
            'viewport_x' => 'float',
            'viewport_y' => 'float',
            'viewport_zoom' => 'float',
        ];
    }

    /** @return BelongsTo<Vault, $this> */
    public function vault(): BelongsTo
    {
        return $this->belongsTo(Vault::class);
    }

    /** @return BelongsTo<KnowledgeEntity, $this> */
    public function focusEntity(): BelongsTo
    {
        return $this->belongsTo(KnowledgeEntity::class, 'focus_entity_id');
    }

    /** @return BelongsTo<KnowledgeContext, $this> */
    public function focusContext(): BelongsTo
    {
        return $this->belongsTo(KnowledgeContext::class, 'focus_context_id');
    }

    /** @return BelongsTo<Perspective, $this> */
    public function perspective(): BelongsTo
    {
        return $this->belongsTo(Perspective::class);
    }
}
