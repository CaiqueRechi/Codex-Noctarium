<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvc_context_entity', function (Blueprint $table): void {
            $table->decimal('position_x', 12, 3)->nullable();
            $table->decimal('position_y', 12, 3)->nullable();
            $table->boolean('is_pinned')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('cvc_context_entity', function (Blueprint $table): void {
            $table->dropColumn(['position_x', 'position_y', 'is_pinned']);
        });
    }
};
