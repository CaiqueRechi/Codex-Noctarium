<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvc_perspectives', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('vault_id')->constrained('cvc_vaults')->restrictOnDelete();
            $table->foreignUuid('source_perspective_id')->nullable()->constrained('cvc_perspectives')->nullOnDelete();
            $table->string('name', 120);
            $table->json('filters');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['vault_id', 'name']);
        });

        Schema::create('cvc_perspective_layouts', function (Blueprint $table): void {
            $table->foreignUuid('perspective_id')->constrained('cvc_perspectives')->cascadeOnDelete();
            $table->foreignUuid('context_id')->constrained('cvc_contexts')->cascadeOnDelete();
            $table->foreignUuid('entity_id')->constrained('cvc_entities')->cascadeOnDelete();
            $table->decimal('position_x', 12, 3)->nullable();
            $table->decimal('position_y', 12, 3)->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();
            $table->primary(['perspective_id', 'context_id', 'entity_id']);
        });

        Schema::table('cvc_workspace_states', function (Blueprint $table): void {
            $table->foreignUuid('perspective_id')
                ->nullable()
                ->after('focus_entity_id')
                ->constrained('cvc_perspectives')
                ->nullOnDelete();
        });

        $timestamp = now();

        DB::table('cvc_vaults')->orderBy('id')->each(function (object $vault) use ($timestamp): void {
            DB::table('cvc_perspectives')->insert([
                'id' => (string) Str::uuid(),
                'vault_id' => $vault->id,
                'source_perspective_id' => null,
                'name' => 'Principal',
                'filters' => json_encode([
                    'context_ids' => [],
                    'entity_types' => [],
                ], JSON_THROW_ON_ERROR),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('cvc_workspace_states', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('perspective_id');
        });

        Schema::dropIfExists('cvc_perspective_layouts');
        Schema::dropIfExists('cvc_perspectives');
    }
};
