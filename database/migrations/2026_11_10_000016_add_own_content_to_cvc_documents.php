<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvc_documents', function (Blueprint $table): void {
            $table->double('own_content')->nullable()->after('content_hash');
        });
    }

    public function down(): void
    {
        Schema::table('cvc_documents', function (Blueprint $table): void {
            $table->dropColumn('own_content');
        });
    }
};
