<?php

namespace App\Models;

use App\Support\SignedFileUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Resource extends Model
{
    use HasFactory;

    const TYPES = [
        'competences',
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
        'chapter_id',
        'type',
        'file_type',
        'title',
        'file_path',
        'file_name',
        'file_size',
        'external_url',
        'source_path',
        'source_hash',
        'is_visible',
        'max_attempts',
        'available_from',
        'available_until',
        'order',
    ];

    protected $casts = [
        'is_visible' => 'boolean',
        'file_size' => 'integer',
        'max_attempts' => 'integer',
        'available_from' => 'datetime',
        'available_until' => 'datetime',
    ];

    /**
     * Une ressource sans bornes reste toujours ouverte : c'est le cas de la
     * quasi-totalité du contenu, seules les évaluations ont une fenêtre.
     */
    public function isWithinAvailabilityWindow(): bool
    {
        if ($this->available_from && $this->available_from->isFuture()) {
            return false;
        }

        return !($this->available_until && $this->available_until->isPast());
    }

    public function availabilityMessage(): ?string
    {
        if ($this->available_from && $this->available_from->isFuture()) {
            return 'Cette ressource sera disponible le ' . $this->available_from->format('d/m/Y à H:i') . '.';
        }

        if ($this->available_until && $this->available_until->isPast()) {
            return 'Cette ressource n\'est plus disponible depuis le ' . $this->available_until->format('d/m/Y à H:i') . '.';
        }

        return null;
    }

    /**
     * Le fichier vit sur le disque privé : le client ne reçoit jamais un chemin
     * exploitable, seulement une URL signée à durée limitée.
     */
    protected $appends = ['file_url'];

    protected $hidden = ['source_path'];

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path
            ? SignedFileUrl::make('files.resource', 'resource', $this->id)
            : null;
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function chapter()
    {
        return $this->belongsTo(Chapter::class);
    }

    public function exercise()
    {
        return $this->hasOne(Exercise::class);
    }

    public function webLesson()
    {
        return $this->hasOne(WebLesson::class);
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
