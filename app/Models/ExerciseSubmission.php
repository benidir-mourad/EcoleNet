<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ExerciseSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'exercise_id',
        'student_id',
        'file_path',
        'content',
        'score',
        'teacher_comment',
        'status',
        'submitted_at',
        'corrected_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'corrected_at' => 'datetime',
        'score' => 'float',
    ];

    public function exercise()
    {
        return $this->belongsTo(Exercise::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
