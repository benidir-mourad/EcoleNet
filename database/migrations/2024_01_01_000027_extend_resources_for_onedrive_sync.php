<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            // Add competences to type enum
            DB::statement("ALTER TABLE resources MODIFY COLUMN type ENUM(
                'competences',
                'presentation',
                'syllabus',
                'exercise',
                'exercise_solution',
                'revision',
                'revision_solution',
                'evaluation',
                'evaluation_solution'
            ) NOT NULL");

            // Add html_interactive to file_type enum (includes all values from migration 21)
            DB::statement("ALTER TABLE resources MODIFY COLUMN file_type ENUM(
                'pdf', 'pptx', 'docx', 'xlsx',
                'image', 'video_upload', 'video_youtube',
                'link', 'qcm', 'drag_drop', 'excel_interactive',
                'file_upload', 'fill_blanks', 'ordering', 'code_editor', 'truth_table',
                'web_lesson', 'html_embed',
                'html_interactive'
            ) NULL");
        }

        Schema::table('resources', function (Blueprint $table) {
            $table->string('source_path', 500)->nullable()->after('external_url');
            $table->string('source_hash', 64)->nullable()->after('source_path');
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn(['source_path', 'source_hash']);
        });

        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE resources MODIFY COLUMN file_type ENUM(
                'pdf', 'pptx', 'docx', 'xlsx',
                'image', 'video_upload', 'video_youtube',
                'link', 'qcm', 'drag_drop', 'excel_interactive',
                'file_upload', 'fill_blanks', 'ordering', 'code_editor', 'truth_table',
                'web_lesson', 'html_embed'
            ) NULL");

            DB::statement("ALTER TABLE resources MODIFY COLUMN type ENUM(
                'presentation', 'syllabus', 'exercise', 'exercise_solution',
                'revision', 'revision_solution', 'evaluation', 'evaluation_solution'
            ) NOT NULL");
        }
    }
};
