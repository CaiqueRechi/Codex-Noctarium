<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvc_relations', function (Blueprint $table): void {
            $table->uuid('cascade_deleted_by_entity_id')
                ->nullable()
                ->after('properties')
                ->index();
        });
    }

    public function down(): void
    {
        Schema::table('cvc_relations', function (Blueprint $table): void {
            $table->dropIndex('cvc_relations_cascade_deleted_by_entity_id_index');
        });

        Schema::table('cvc_relations', function (Blueprint $table): void {
            $table->dropColumn('cascade_deleted_by_entity_id');
        });
    }
};
