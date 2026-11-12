<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_demo_fixtures', function (Blueprint $table): void {
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->cascadeOnDelete();
            $table->string('fixture_key', 100);
            $table->uuid('record_id');
            $table->primary(['vault_id', 'fixture_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_demo_fixtures');
    }
};
