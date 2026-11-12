<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Entities\CountNoteUse;
use Illuminate\Http\Response;

final class CountNoteSearchController
{
    public function __invoke(string $entity, CountNoteUse $countNoteUse): Response
    {
        $countNoteUse->search($entity);

        return response()->noContent();
    }
}
