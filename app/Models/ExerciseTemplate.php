<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExerciseTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'title',
        'type',
        'language',
        'level',
        'summary',
        'instructions',
        'content',
        'max_score',
        'auto_correct',
    ];

    protected $casts = [
        'content' => 'array',
        'max_score' => 'integer',
        'auto_correct' => 'boolean',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
