<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Models;

use Illuminate\Database\Eloquent\Model;

final class SearchDocument extends Model
{
    protected $table = 'cvc_search_index';

    protected $primaryKey = 'entity_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'entity_id',
        'vault_id',
        'title',
        'content',
        'content_hash',
        'entity_type',
        'tags',
        'properties',
        'contexts',
        'relations',
    ];

    protected function casts(): array
    {
        return ['tags' => 'array'];
    }
}
