<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_entities', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->restrictOnDelete();
            $table->string('kind', 32)->index();
            $table->string('title')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('cvc_context_entity', function (Blueprint $table): void {
            $table->foreignUuid('context_id')->constrained('cvc_contexts')->cascadeOnDelete();
            $table->foreignUuid('entity_id')->constrained('cvc_entities')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['context_id', 'entity_id']);
        });

        Schema::create('cvc_documents', function (Blueprint $table): void {
            $table->uuid('entity_id')->primary();
            $table->foreign('entity_id')->references('id')->on('cvc_entities')->restrictOnDelete();
            $table->string('storage_path', 512);
            $table->unsignedBigInteger('revision');
            $table->char('content_hash', 64);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_documents');
        Schema::dropIfExists('cvc_context_entity');
        Schema::dropIfExists('cvc_entities');
    }
};
