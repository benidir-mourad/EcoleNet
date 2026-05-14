<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('type')->default('code_editor');
            $table->string('language')->nullable();
            $table->string('level')->default('beginner');
            $table->string('summary')->nullable();
            $table->text('instructions')->nullable();
            $table->json('content')->nullable();
            $table->unsignedInteger('max_score')->default(20);
            $table->boolean('auto_correct')->default(false);
            $table->timestamps();

            $table->index(['teacher_id', 'type', 'language']);
            $table->index(['teacher_id', 'level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_templates');
    }
};
