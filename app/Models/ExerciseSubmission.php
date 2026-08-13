<?php

namespace App\Models;

use App\Support\SignedFileUrl;
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

    /** La copie rendue vit sur le disque privé — voir App\Support\SignedFileUrl. */
    protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path
            ? SignedFileUrl::make('files.submission', 'submission', $this->id)
            : null;
    }

    public function exercise()
    {
        return $this->belongsTo(Exercise::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
