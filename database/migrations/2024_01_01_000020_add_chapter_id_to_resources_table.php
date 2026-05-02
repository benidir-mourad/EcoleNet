<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add file_upload to the file_type enum (was missing)
        DB::statement("ALTER TABLE resources MODIFY COLUMN file_type ENUM(
            'pdf','pptx','docx','xlsx','image',
            'video_upload','video_youtube','link',
            'qcm','drag_drop','excel_interactive','file_upload'
        ) NULL");

        Schema::table('resources', function (Blueprint $table) {
            $table->foreignId('chapter_id')
                  ->nullable()
                  ->after('course_id')
                  ->constrained('chapters')
                  ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropForeign(['chapter_id']);
            $table->dropColumn('chapter_id');
        });

        DB::statement("ALTER TABLE resources MODIFY COLUMN file_type ENUM(
            'pdf','pptx','docx','xlsx','image',
            'video_upload','video_youtube','link',
            'qcm','drag_drop','excel_interactive'
        ) NULL");
    }
};
