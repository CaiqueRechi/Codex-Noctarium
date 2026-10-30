<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_workspace_states', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->cascadeOnDelete();
            $table->string('user_id', 64);
            $table->double('viewport_x')->default(120);
            $table->double('viewport_y')->default(120);
            $table->double('viewport_zoom')->default(0.65);
            $table->foreignUuid('focus_entity_id')->nullable()->constrained('cvc_entities')->nullOnDelete();
            $table->timestamps();
            $table->unique(['vault_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_workspace_states');
    }
};
