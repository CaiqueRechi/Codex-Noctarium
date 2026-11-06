<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvc_entities', function (Blueprint $table): void {
            $table->string('entity_type', 64)->nullable()->after('kind')->index();
            $table->json('properties')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('cvc_entities', function (Blueprint $table): void {
            $table->dropIndex(['entity_type']);
            $table->dropColumn(['entity_type', 'properties']);
        });
    }
};
