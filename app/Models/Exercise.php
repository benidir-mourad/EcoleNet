<?php

namespace App\Models;

use App\Support\SignedFileUrl;
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

    /** Le fichier modèle vit sur le disque privé — voir App\Support\SignedFileUrl. */
    protected $appends = ['template_file_url'];

    public function getTemplateFileUrlAttribute(): ?string
    {
        return $this->template_file_path
            ? SignedFileUrl::make('files.template', 'exercise', $this->id)
            : null;
    }

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }

    public function submissions()
    {
        return $this->hasMany(ExerciseSubmission::class);
    }
}
