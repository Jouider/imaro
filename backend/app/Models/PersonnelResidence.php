<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PersonnelResidence extends Model
{
    use SoftDeletes;

    protected $table = 'personnel_residences';

    protected $fillable = [
        'tenant_id', 'name', 'poste', 'residence_id', 'user_id',
        'phone', 'cin', 'permissions', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    /** Compte de connexion (téléphone + code d'accès) du membre du personnel. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
