<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_relations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->restrictOnDelete();
            $table->foreignUuid('source_entity_id')->constrained('cvc_entities')->restrictOnDelete();
            $table->foreignUuid('target_entity_id')->constrained('cvc_entities')->restrictOnDelete();
            $table->foreignUuid('context_id')->nullable()->constrained('cvc_contexts')->restrictOnDelete();
            $table->string('relation_type', 64)->nullable()->index();
            $table->boolean('is_directed')->default(false);
            $table->json('properties')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['vault_id', 'source_entity_id']);
            $table->index(['vault_id', 'target_entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_relations');
    }
};
