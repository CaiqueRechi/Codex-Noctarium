<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Perspective extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'cvc_perspectives';

    protected $fillable = [
        'vault_id',
        'source_perspective_id',
        'name',
        'filters',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
        ];
    }

    /** @return BelongsTo<Vault, $this> */
    public function vault(): BelongsTo
    {
        return $this->belongsTo(Vault::class);
    }

    /** @return BelongsTo<Perspective, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_perspective_id');
    }

    /** @return HasMany<PerspectiveLayout, $this> */
    public function layouts(): HasMany
    {
        return $this->hasMany(PerspectiveLayout::class);
    }
}
