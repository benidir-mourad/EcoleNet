<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exercise_id')->constrained('exercises')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('file_path')->nullable();
            $table->longText('content')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('teacher_comment')->nullable();
            $table->enum('status', ['submitted', 'corrected', 'returned'])->default('submitted');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('corrected_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_submissions');
    }
};
