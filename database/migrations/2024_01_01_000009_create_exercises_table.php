<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resource_id')->constrained('resources')->cascadeOnDelete();
            $table->string('title');
            $table->text('instructions')->nullable();
            if (DB::connection()->getDriverName() === 'sqlite') {
                $table->string('type');
            } else {
                $table->enum('type', ['file_upload', 'qcm', 'drag_drop', 'excel_interactive']);
            }
            $table->unsignedInteger('max_score')->default(20);
            $table->boolean('auto_correct')->default(false);
            $table->timestamp('deadline')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercises');
    }
};
