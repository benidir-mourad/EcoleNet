<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Exercise extends Model
{
    use HasFactory;

    protected $fillable = [
        'resource_id',
        'title',
        'instructions',
        'type',
        'content',
        'max_score',
        'auto_correct',
        'deadline',
        'template_file_path',
        'template_file_name',
    ];

    protected $casts = [
        'auto_correct' => 'boolean',
        'deadline'     => 'datetime',
        'max_score'    => 'integer',
        'content'      => 'array',
    ];

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }

    public function submissions()
    {
        return $this->hasMany(ExerciseSubmission::class);
    }
}
