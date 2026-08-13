<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Une évaluation était visible ou non, sans notion de date : l'enseignant devait
 * la rendre visible au bon moment et la masquer ensuite à la main. Les deux bornes
 * sont nulles par défaut, ce qui conserve exactement le comportement actuel.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->timestamp('available_from')->nullable()->after('max_attempts');
            $table->timestamp('available_until')->nullable()->after('available_from');
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn(['available_from', 'available_until']);
        });
    }
};
