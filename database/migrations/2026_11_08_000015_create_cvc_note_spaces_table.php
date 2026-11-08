<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_note_spaces', function (Blueprint $table): void {
            $table->foreignUuid('entity_id')->primary()->constrained('cvc_entities')->restrictOnDelete();
            $table->foreignUuid('context_id')->unique()->constrained('cvc_contexts')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_note_spaces');
    }
};
