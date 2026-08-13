<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rien ne gardait trace de qui avait validé une inscription, désactivé un compte,
 * supprimé une section ou corrigé une copie. Sur une plateforme qui traite des
 * données de mineurs, c'est la première chose qu'on demande après un incident.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_log', function (Blueprint $table) {
            $table->id();

            // L'auteur peut disparaître ; la trace de l'action doit lui survivre.
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_label');

            $table->string('action', 60);
            $table->string('subject_type', 60)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('summary', 255);
            $table->json('context')->nullable();
            $table->string('ip', 45)->nullable();

            $table->timestamps();

            $table->index(['action', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
            $table->index('actor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }
};
