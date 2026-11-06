<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->restrictOnDelete();
            $table->foreignUuid('perspective_id')->constrained('cvc_perspectives')->restrictOnDelete();
            $table->string('name', 120);
            $table->string('kind', 16)->default('named');
            $table->string('created_by', 64);
            $table->json('snapshot');
            $table->char('snapshot_hash', 64);
            $table->timestamps();
            $table->index(['perspective_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_versions');
    }
};
