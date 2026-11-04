<?php

declare(strict_types=1);

use CrowVaultCanvas\Http\Controllers\AttachEntityToContextController;
use CrowVaultCanvas\Http\Controllers\DestroyRelationController;
use CrowVaultCanvas\Http\Controllers\ShowDocumentController;
use CrowVaultCanvas\Http\Controllers\StoreDocumentController;
use CrowVaultCanvas\Http\Controllers\StoreRelationController;
use CrowVaultCanvas\Http\Controllers\UpdateDocumentController;
use CrowVaultCanvas\Http\Controllers\UpdateEntityLayoutController;
use CrowVaultCanvas\Http\Controllers\UpdateEntityPropertiesController;
use CrowVaultCanvas\Http\Controllers\UpdateWorkspaceStateController;
use CrowVaultCanvas\Http\Controllers\VaultController;
use Illuminate\Support\Facades\Route;

Route::middleware(config('crow-vault-canvas.route.middleware'))
    ->prefix(config('crow-vault-canvas.route.prefix'))
    ->name(config('crow-vault-canvas.route.name'))
    ->group(function (): void {
        Route::get('/', VaultController::class)->name('vault');
        Route::get('/documents/{entity}', ShowDocumentController::class)->name('documents.show');
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
            });
        Route::patch('/workspace', UpdateWorkspaceStateController::class)
            ->middleware([
                ...config('crow-vault-canvas.route.write_middleware'),
                ...config('crow-vault-canvas.route.workspace_write_middleware'),
            ])
            ->name('workspace.update');
    });
