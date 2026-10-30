<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Vault extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'cvc_vaults';

    protected $fillable = [
        'id',
        'name',
    ];

    /** @return HasMany<KnowledgeContext, $this> */
    public function contexts(): HasMany
    {
        return $this->hasMany(KnowledgeContext::class);
    }

    /** @return HasMany<KnowledgeContext, $this> */
    public function universes(): HasMany
    {
        return $this->contexts()
            ->whereNull('parent_id')
            ->where('kind', KnowledgeContext::KIND_UNIVERSE)
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    /** @return HasMany<KnowledgeEntity, $this> */
    public function entities(): HasMany
    {
        return $this->hasMany(KnowledgeEntity::class);
    }
}
