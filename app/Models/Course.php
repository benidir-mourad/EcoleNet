<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'teacher_id',
        'name',
        'slug',
        'description',
        'order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function resources()
    {
        return $this->hasMany(Resource::class)->orderBy('order');
    }

    public function forumPosts()
    {
        return $this->hasMany(ForumPost::class)->whereNull('parent_id')->orderByDesc('is_pinned')->latest();
    }

    public function studentProgress()
    {
        return $this->hasMany(StudentProgress::class);
    }
}
