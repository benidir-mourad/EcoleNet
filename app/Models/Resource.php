<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Resource extends Model
{
    use HasFactory;

    const TYPES = [
        'presentation',
        'syllabus',
        'exercise',
        'exercise_solution',
        'revision',
        'revision_solution',
        'evaluation',
        'evaluation_solution',
    ];

    protected $fillable = [
        'course_id',
        'type',
        'file_type',
        'title',
        'file_path',
        'file_name',
        'file_size',
        'external_url',
        'is_visible',
        'order',
    ];

    protected $casts = [
        'is_visible' => 'boolean',
        'file_size' => 'integer',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function exercise()
    {
        return $this->hasOne(Exercise::class);
    }

    public function qcmQuestions()
    {
        return $this->hasMany(QcmQuestion::class)->orderBy('order');
    }

    public function qcmAttempts()
    {
        return $this->hasMany(QcmAttempt::class);
    }

    public function progress()
    {
        return $this->hasMany(StudentProgress::class);
    }
}
