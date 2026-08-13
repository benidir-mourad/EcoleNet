<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Les 27 clés étrangères déclarées depuis la migration 5 n'ont jamais existé en base :
 * le serveur créait les tables en MyISAM, qui accepte la syntaxe des contraintes et
 * les ignore. Les cascades étaient donc inopérantes et des orphelins s'étaient déjà
 * formés. Les tables sont passées en InnoDB, cette migration rétablit les contraintes.
 */
return new class extends Migration
{
    /** table => [colonne, table référencée, action de suppression] */
    private const KEYS = [
        'sections'             => [['class_id',     'classes',       'cascade']],
        'courses'              => [['section_id',   'sections',      'cascade'],
                                   ['teacher_id',   'users',         'cascade']],
        'resources'            => [['course_id',    'courses',       'cascade'],
                                   ['chapter_id',   'chapters',      'cascade']],
        'chapters'             => [['course_id',    'courses',       'cascade']],
        'enrollments'          => [['student_id',   'users',         'cascade'],
                                   ['class_id',     'classes',       'cascade'],
                                   ['approved_by',  'users',         'null']],
        'exercises'            => [['resource_id',  'resources',     'cascade']],
        'exercise_submissions' => [['exercise_id',  'exercises',     'cascade'],
                                   ['student_id',   'users',         'cascade']],
        'exercise_templates'   => [['teacher_id',   'users',         'cascade']],
        'qcm_questions'        => [['resource_id',  'resources',     'cascade']],
        'qcm_options'          => [['question_id',  'qcm_questions', 'cascade']],
        'qcm_attempts'         => [['student_id',   'users',         'cascade'],
                                   ['resource_id',  'resources',     'cascade']],
        'student_progress'     => [['student_id',   'users',         'cascade'],
                                   ['course_id',    'courses',       'cascade'],
                                   ['resource_id',  'resources',     'cascade']],
        'messages'             => [['sender_id',    'users',         'cascade'],
                                   ['receiver_id',  'users',         'cascade']],
        'forum_posts'          => [['course_id',    'courses',       'cascade'],
                                   ['user_id',      'users',         'cascade'],
                                   ['parent_id',    'forum_posts',   'cascade']],
        'internal_notifications' => [['user_id',    'users',         'cascade']],
        'web_lessons'          => [['resource_id',  'resources',     'cascade']],
    ];

    public function up(): void
    {
        // SQLite gère ses clés étrangères à la création de table : rien à rétablir.
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        foreach (self::KEYS as $table => $keys) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            foreach ($keys as [$column, $references, $onDelete]) {
                if ($this->constraintExists($table, $column)) {
                    continue;
                }

                Schema::table($table, function (Blueprint $blueprint) use ($column, $references, $onDelete) {
                    $foreign = $blueprint->foreign($column)->references('id')->on($references);
                    $onDelete === 'null' ? $foreign->nullOnDelete() : $foreign->cascadeOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        foreach (self::KEYS as $table => $keys) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            foreach ($keys as [$column]) {
                if (!$this->constraintExists($table, $column)) {
                    continue;
                }

                Schema::table($table, function (Blueprint $blueprint) use ($column) {
                    $blueprint->dropForeign([$column]);
                });
            }
        }
    }

    private function constraintExists(string $table, string $column): bool
    {
        return DB::selectOne(
            'SELECT 1 AS found FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
               AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1',
            [$table, $column]
        ) !== null;
    }
};
