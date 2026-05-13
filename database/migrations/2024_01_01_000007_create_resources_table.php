<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            if (DB::connection()->getDriverName() === 'sqlite') {
                $table->string('type');
                $table->string('file_type')->nullable();
            } else {
                $table->enum('type', [
                    'presentation',
                    'syllabus',
                    'exercise',
                    'exercise_solution',
                    'revision',
                    'revision_solution',
                    'evaluation',
                    'evaluation_solution',
                ]);
                $table->enum('file_type', [
                    'pdf', 'pptx', 'docx', 'xlsx',
                    'image', 'video_upload', 'video_youtube',
                    'link', 'qcm', 'drag_drop', 'excel_interactive',
                ])->nullable();
            }
            $table->string('title');
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('external_url')->nullable();
            $table->boolean('is_visible')->default(false);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resources');
    }
};
