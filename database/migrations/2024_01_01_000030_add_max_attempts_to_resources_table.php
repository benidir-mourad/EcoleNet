<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un QCM pouvait être repassé indéfiniment, y compris de type evaluation : le
 * numéro de tentative était enregistré mais aucune borne appliquée, ce qui privait
 * la note de toute valeur certificative.
 *
 * NULL conserve le comportement actuel, illimité, qui reste le bon défaut pour un
 * exercice d'entraînement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_attempts')->nullable()->after('is_visible');
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn('max_attempts');
        });
    }
};
