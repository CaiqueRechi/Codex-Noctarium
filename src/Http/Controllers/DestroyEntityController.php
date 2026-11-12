<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Controllers;

use CrowVaultCanvas\Application\Trash\TrashNoteWithSubnotes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class DestroyEntityController
{
    public function __invoke(Request $request, string $entity, TrashNoteWithSubnotes $trashNote): JsonResponse
    {
        $trashing = $trashNote->handle($entity, $request->boolean('with_subnotes'));

        if ($trashing->deletion === null) {
            return response()->json([
                'message' => "Esta nota tem {$trashing->pendingSubnotes} subnota(s). Confirme para excluí-las junto.",
                'code' => 'has_subnotes',
                'subnotes' => $trashing->pendingSubnotes,
            ], Response::HTTP_CONFLICT);
        }

        $deletion = $trashing->deletion;

        return response()->json([
            'trashItem' => [
                'id' => $deletion->entity->getKey(),
                'title' => $deletion->entity->title,
                'deletedAt' => $deletion->entity->deleted_at?->toAtomString(),
            ],
            'deletedRelationIds' => $deletion->deletedRelationIds,
            'trashedSubnoteIds' => $trashing->trashedSubnoteIds,
        ]);
    }
}
