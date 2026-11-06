<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class VaultVersion extends Model
{
    use HasUuids;

    public const KIND_NAMED = 'named';

    public const KIND_RECOVERY = 'recovery';

    protected $table = 'cvc_versions';

    protected $fillable = [
        'vault_id',
        'perspective_id',
        'name',
        'kind',
        'created_by',
        'snapshot',
        'snapshot_hash',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
        ];
    }

    /** @return BelongsTo<Vault, $this> */
    public function vault(): BelongsTo
    {
        return $this->belongsTo(Vault::class);
    }

    /** @return BelongsTo<Perspective, $this> */
    public function perspective(): BelongsTo
    {
        return $this->belongsTo(Perspective::class);
    }
}
