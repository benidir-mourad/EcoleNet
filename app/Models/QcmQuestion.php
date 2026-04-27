<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class QcmQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'resource_id',
        'question',
        'order',
        'points',
        'explanation',
    ];

    protected $casts = [
        'points' => 'integer',
    ];

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }

    public function options()
    {
        return $this->hasMany(QcmOption::class, 'question_id')->orderBy('order');
    }
}
