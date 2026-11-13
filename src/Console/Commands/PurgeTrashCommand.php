<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Console\Commands;

use CrowVaultCanvas\Application\Trash\PurgeTrash;
use Illuminate\Console\Command;

final class PurgeTrashCommand extends Command
{
    protected $signature = 'cvc:purge-trash';

    protected $description = 'Delete for good the Codex Noctarium notes left in the trash for seven days';

    public function handle(PurgeTrash $purgeTrash): int
    {
        $purged = $purgeTrash->handle();
        $this->components->info(count($purged).' note(s) deleted for good.');

        return self::SUCCESS;
    }
}
