<?php

declare(strict_types=1);

use CrowVaultCanvas\Http\Controllers\AttachEntityToContextController;
use CrowVaultCanvas\Http\Controllers\DestroyEntityController;
use CrowVaultCanvas\Http\Controllers\DestroyRelationController;
use CrowVaultCanvas\Http\Controllers\ListContextRootsController;
use CrowVaultCanvas\Http\Controllers\OperationalStatusController;
use CrowVaultCanvas\Http\Controllers\RestoreEntityController;
use CrowVaultCanvas\Http\Controllers\RestoreVersionController;
use CrowVaultCanvas\Http\Controllers\SearchVaultController;
use CrowVaultCanvas\Http\Controllers\ShowAttachmentController;
use CrowVaultCanvas\Http\Controllers\ShowContextController;
use CrowVaultCanvas\Http\Controllers\ShowDocumentController;
use CrowVaultCanvas\Http\Controllers\StoreAttachmentController;
use CrowVaultCanvas\Http\Controllers\StoreContextController;
use CrowVaultCanvas\Http\Controllers\StoreDocumentController;
use CrowVaultCanvas\Http\Controllers\StorePerspectiveController;
use CrowVaultCanvas\Http\Controllers\StoreRelationController;
use CrowVaultCanvas\Http\Controllers\StoreVersionController;
use CrowVaultCanvas\Http\Controllers\UpdateDocumentController;
use CrowVaultCanvas\Http\Controllers\UpdateEntityLayoutController;
use CrowVaultCanvas\Http\Controllers\UpdateEntityPropertiesController;
use CrowVaultCanvas\Http\Controllers\UpdatePerspectiveController;
use CrowVaultCanvas\Http\Controllers\UpdatePerspectiveLayoutController;
use CrowVaultCanvas\Http\Controllers\UpdateWorkspaceStateController;
use CrowVaultCanvas\Http\Controllers\VaultController;
use Illuminate\Support\Facades\Route;

Route::middleware(config('crow-vault-canvas.route.middleware'))
    ->prefix(config('crow-vault-canvas.route.prefix'))
    ->name(config('crow-vault-canvas.route.name'))
    ->group(function (): void {
        Route::get('/', VaultController::class)->name('vault');
        Route::get('/search', SearchVaultController::class)
            ->middleware(config('crow-vault-canvas.route.search_middleware'))
            ->name('search');
        Route::get('/operations', OperationalStatusController::class)
            ->middleware(config('crow-vault-canvas.route.operations_middleware'))
            ->name('operations.index');
        Route::get('/contexts', ListContextRootsController::class)->name('contexts.index');
        Route::get('/contexts/{context}', ShowContextController::class)->name('contexts.show');
        Route::get('/documents/{entity}', ShowDocumentController::class)->name('documents.show');
        Route::get('/attachments/{attachment}', ShowAttachmentController::class)
            ->name('attachments.show');
        Route::middleware(config('crow-vault-canvas.route.write_middleware'))
            ->group(function (): void {
                Route::middleware(config('crow-vault-canvas.route.document_write_middleware'))
                    ->group(function (): void {
                        Route::post('/documents', StoreDocumentController::class)->name('documents.store');
                        Route::patch('/documents/{entity}', UpdateDocumentController::class)->name('documents.update');
                    });
                Route::patch('/entities/{entity}', UpdateEntityPropertiesController::class)
                    ->middleware(config('crow-vault-canvas.route.entity_write_middleware'))
                    ->name('entities.update');
                Route::post('/contexts', StoreContextController::class)
                    ->middleware(config('crow-vault-canvas.route.context_write_middleware'))
                    ->name('contexts.store');
                Route::post('/entities/{entity}/attachments', StoreAttachmentController::class)
                    ->middleware(config('crow-vault-canvas.route.attachment_write_middleware'))
                    ->name('entities.attachments.store');
                Route::delete('/entities/{entity}', DestroyEntityController::class)
                    ->middleware(config('crow-vault-canvas.route.trash_write_middleware'))
                    ->name('entities.destroy');
                Route::post('/trash/{entity}/restore', RestoreEntityController::class)
                    ->middleware(config('crow-vault-canvas.route.trash_write_middleware'))
                    ->name('trash.restore');
                Route::post('/contexts/{context}/entities', AttachEntityToContextController::class)
                    ->middleware(config('crow-vault-canvas.route.relation_write_middleware'))
                    ->name('contexts.entities.store');
                Route::patch('/contexts/{context}/entities/{entity}/layout', UpdateEntityLayoutController::class)
                    ->middleware(config('crow-vault-canvas.route.layout_write_middleware'))
                    ->name('contexts.entities.layout.update');
                Route::post('/relations', StoreRelationController::class)
                    ->middleware(config('crow-vault-canvas.route.relation_write_middleware'))
                    ->name('relations.store');
                Route::delete('/relations/{relation}', DestroyRelationController::class)
                    ->middleware(config('crow-vault-canvas.route.relation_write_middleware'))
                    ->name('relations.destroy');
                Route::post('/perspectives', StorePerspectiveController::class)
                    ->middleware(config('crow-vault-canvas.route.perspective_write_middleware'))
                    ->name('perspectives.store');
                Route::patch('/perspectives/{perspective}', UpdatePerspectiveController::class)
                    ->middleware(config('crow-vault-canvas.route.perspective_write_middleware'))
                    ->name('perspectives.update');
                Route::patch(
                    '/perspectives/{perspective}/contexts/{context}/entities/{entity}/layout',
                    UpdatePerspectiveLayoutController::class,
                )
                    ->middleware(config('crow-vault-canvas.route.layout_write_middleware'))
                    ->name('perspectives.layouts.update');
                Route::post('/perspectives/{perspective}/versions', StoreVersionController::class)
                    ->middleware(config('crow-vault-canvas.route.version_write_middleware'))
                    ->name('perspectives.versions.store');
                Route::post('/versions/{version}/restore', RestoreVersionController::class)
                    ->middleware(config('crow-vault-canvas.route.version_write_middleware'))
                    ->name('versions.restore');
            });
        Route::patch('/workspace', UpdateWorkspaceStateController::class)
            ->middleware([
                ...config('crow-vault-canvas.route.write_middleware'),
                ...config('crow-vault-canvas.route.workspace_write_middleware'),
            ])
            ->name('workspace.update');
    });
