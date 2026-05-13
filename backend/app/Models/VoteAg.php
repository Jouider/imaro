<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoteAg extends Model
{
    use HasFactory;

    protected $table = 'votes_ag';

    protected $fillable = [
        'assemblee_id', 'user_id', 'procuration_user_id',
        'resolution', 'vote', 'voted_at',
    ];

    protected function casts(): array
    {
        return [
            'voted_at' => 'datetime',
        ];
    }

    public function assemblee(): BelongsTo
    {
        return $this->belongsTo(Assemblee::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function procuration(): BelongsTo
    {
        return $this->belongsTo(User::class, 'procuration_user_id');
    }
}
