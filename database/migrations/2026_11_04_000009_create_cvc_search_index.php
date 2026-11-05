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
            $table->json('tags')->nullable()->after('properties');
            $table->unsignedBigInteger('search_version')->default(1)->after('tags');
        });

        Schema::create('cvc_search_index', function (Blueprint $table): void {
            $table->uuid('entity_id')->primary();
            $table->foreign('entity_id')->references('id')->on('cvc_entities')->cascadeOnDelete();
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->longText('content');
            $table->char('content_hash', 64);
            $table->string('entity_type', 64)->nullable()->index();
            $table->json('tags');
            $table->longText('properties');
            $table->longText('contexts');
            $table->longText('relations');
            $table->timestamps();
            $table->index(['vault_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvc_search_index');

        Schema::table('cvc_entities', function (Blueprint $table): void {
            $table->dropColumn(['tags', 'search_version']);
        });
    }
};
