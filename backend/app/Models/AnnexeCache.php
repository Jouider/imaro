<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnexeCache extends Model
{
    public $timestamps = false;

    protected $table = 'annexes_cache';

    protected $fillable = [
        'residence_id', 'exercice', 'annexe_num', 'data',
        'pdf_path', 'generated_at', 'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'generated_at' => 'datetime',
            'exercice' => 'integer',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }
}
