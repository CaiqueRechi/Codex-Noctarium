<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_document_revisions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('entity_id')->constrained('cvc_entities')->restrictOnDelete();
            $table->unsignedBigInteger('revision');
            $table->string('format', 32)->default('markdown');
            $table->longText('content');
            $table->json('metadata')->nullable();
            $table->char('content_hash', 64);
            $table->unsignedBigInteger('content_bytes');
            $table->timestamps();
            $table->unique(['entity_id', 'revision']);
            $table->index(['entity_id', 'created_at']);
        });

        Schema::table('cvc_documents', function (Blueprint $table): void {
            $table->foreignUuid('current_revision_id')
                ->nullable()
                ->after('content_hash')
                ->constrained('cvc_document_revisions')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cvc_documents', function (Blueprint $table): void {
            $table->dropForeign(['current_revision_id']);
            $table->dropColumn('current_revision_id');
        });

        Schema::dropIfExists('cvc_document_revisions');
    }
};
