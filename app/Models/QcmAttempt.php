<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class QcmAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'resource_id',
        'answers',
        'score',
        'max_score',
        'attempt_number',
        'completed_at',
    ];

    protected $casts = [
        'answers' => 'array',
        'score' => 'float',
        'max_score' => 'float',
        'completed_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }
}
