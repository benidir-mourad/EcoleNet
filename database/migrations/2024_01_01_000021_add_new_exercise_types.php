<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extend exercises.type enum
        DB::statement("ALTER TABLE exercises MODIFY COLUMN type ENUM(
            'file_upload','qcm','drag_drop','excel_interactive',
            'fill_blanks','ordering','code_editor','truth_table'
        ) NOT NULL");

        // Extend resources.file_type enum
        DB::statement("ALTER TABLE resources MODIFY COLUMN file_type ENUM(
            'pdf','pptx','docx','xlsx','image',
            'video_upload','video_youtube','link',
            'qcm','drag_drop','excel_interactive','file_upload',
            'fill_blanks','ordering','code_editor','truth_table'
        ) NULL");

        // Add template file fields to exercises
        Schema::table('exercises', function (Blueprint $table) {
            $table->string('template_file_path')->nullable()->after('deadline');
            $table->string('template_file_name')->nullable()->after('template_file_path');
        });
    }

    public function down(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            $table->dropColumn(['template_file_path', 'template_file_name']);
        });

        DB::statement("ALTER TABLE exercises MODIFY COLUMN type ENUM(
            'file_upload','qcm','drag_drop','excel_interactive'
        ) NOT NULL");

        DB::statement("ALTER TABLE resources MODIFY COLUMN file_type ENUM(
            'pdf','pptx','docx','xlsx','image',
            'video_upload','video_youtube','link',
            'qcm','drag_drop','excel_interactive','file_upload'
        ) NULL");
    }
};
