<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'phone', 'logo', 'plan', 'max_logins',
        'rc', 'if_number', 'rib', 'subdomain', 'status', 'trial_ends_at',
        'onboarding_completed_at', 'onboarding_step',
        'renewal_at', 'discount_pct',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'max_logins' => 'integer',
            'onboarding_completed_at' => 'datetime',
            'onboarding_step' => 'integer',
            'renewal_at' => 'date',
            'discount_pct' => 'integer',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function residences(): HasMany
    {
        return $this->hasMany(Residence::class);
    }

    public function prestataires(): HasMany
    {
        return $this->hasMany(Prestataire::class);
    }
}
