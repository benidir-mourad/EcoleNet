<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Les cours portaient un teacher_id, pas les classes ni les sections. La propriété
 * d'une classe n'était donc pas exprimable, et les contrôleurs qui gèrent classes,
 * sections et inscriptions ne pouvaient vérifier aucune appartenance : tout compte
 * enseignant pouvait renommer ou supprimer la section d'un collègue.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('classes', 'teacher_id')) {
            Schema::table('classes', function (Blueprint $table) {
                $table->foreignId('teacher_id')
                      ->nullable()
                      ->after('id')
                      ->constrained('users')
                      ->nullOnDelete();
            });
        }

        // Chaque classe revient à l'enseignant qui a créé ses cours ; à défaut,
        // au premier compte enseignant.
        $fallback = DB::table('users')->where('role', 'teacher')->orderBy('id')->value('id');

        foreach (DB::table('classes')->whereNull('teacher_id')->pluck('id') as $classId) {
            $owner = DB::table('courses')
                ->join('sections', 'courses.section_id', '=', 'sections.id')
                ->where('sections.class_id', $classId)
                ->orderBy('courses.id')
                ->value('courses.teacher_id');

            DB::table('classes')->where('id', $classId)->update(['teacher_id' => $owner ?? $fallback]);
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('classes', 'teacher_id')) {
            return;
        }

        Schema::table('classes', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
            $table->dropColumn('teacher_id');
        });
    }
};
