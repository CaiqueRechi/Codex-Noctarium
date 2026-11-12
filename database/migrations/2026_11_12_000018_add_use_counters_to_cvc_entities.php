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
            $table->unsignedInteger('access_count')->default(0)->after('search_version');
            $table->unsignedInteger('search_count')->default(0)->after('access_count');
        });
    }

    public function down(): void
    {
        Schema::table('cvc_entities', function (Blueprint $table): void {
            $table->dropColumn(['access_count', 'search_count']);
        });
    }
};
