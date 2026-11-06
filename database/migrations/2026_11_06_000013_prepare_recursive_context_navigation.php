<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvc_contexts', function (Blueprint $table): void {
            $table->index(
                ['vault_id', 'parent_id', 'sort_order'],
                'cvc_contexts_vault_parent_sort_index',
            );
        });

        Schema::table('cvc_workspace_states', function (Blueprint $table): void {
            $table->foreignUuid('focus_context_id')
                ->nullable()
                ->after('focus_entity_id')
                ->constrained('cvc_contexts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('cvc_workspace_states', 'focus_context_id')) {
            Schema::table('cvc_workspace_states', function (Blueprint $table): void {
                $table->dropForeign(['focus_context_id']);
                $table->dropColumn('focus_context_id');
            });
        }

        if (
            DB::getDriverName() === 'mysql'
            && ! Schema::hasIndex('cvc_contexts', 'cvc_contexts_vault_id_foreign')
        ) {
            Schema::table('cvc_contexts', function (Blueprint $table): void {
                $table->index('vault_id', 'cvc_contexts_vault_id_foreign');
            });
        }

        Schema::table('cvc_contexts', function (Blueprint $table): void {
            $table->dropIndex('cvc_contexts_vault_parent_sort_index');
        });
    }
};
