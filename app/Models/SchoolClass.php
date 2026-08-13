<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SchoolClass extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'teacher_id',
        'name',
        'slug',
        'description',
        'year',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /** Restreint aux classes que l'utilisateur peut gérer ; un admin les voit toutes. */
    public function scopeManageableBy($query, User $user)
    {
        return $user->role === 'admin'
            ? $query
            : $query->where('teacher_id', $user->id);
    }

    public function sections()
    {
        return $this->hasMany(Section::class, 'class_id')->orderBy('order');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'class_id');
    }

    public function students()
    {
        return $this->belongsToMany(User::class, 'enrollments', 'class_id', 'student_id')
            ->withPivot('status', 'approved_at', 'approved_by')
            ->withTimestamps();
    }
}
