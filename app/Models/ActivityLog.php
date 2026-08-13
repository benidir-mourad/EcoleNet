<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $table = 'activity_log';

    protected $fillable = [
        'actor_id',
        'actor_label',
        'action',
        'subject_type',
        'subject_id',
        'summary',
        'context',
        'ip',
    ];

    protected $casts = [
        'context' => 'array',
    ];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
