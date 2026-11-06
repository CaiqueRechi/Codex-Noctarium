<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_operations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->restrictOnDelete();
            $table->foreignUuid('subject_entity_id')->nullable()->constrained('cvc_entities')->restrictOnDelete();
            $table->string('operation_type', 64);
            $table->string('status', 20);
            $table->unsignedInteger('progress_current')->default(0);
            $table->unsignedInteger('progress_total')->default(1);
            $table->string('message');
            $table->string('error_code', 64)->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['vault_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_operations');
    }
};
