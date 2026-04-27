<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentProgress extends Model
{
    use HasFactory;

    protected $table = 'student_progress';

    protected $fillable = [
        'student_id',
        'course_id',
        'resource_id',
        'is_viewed',
        'is_completed',
        'viewed_at',
        'completed_at',
    ];

    protected $casts = [
        'is_viewed' => 'boolean',
        'is_completed' => 'boolean',
        'viewed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }
}
