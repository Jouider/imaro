<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'phone', 'cin', 'email', 'password',
        'access_code', 'must_change_code', 'must_change_password',
        'role', 'otp_code', 'otp_expires_at', 'lang',
        'avatar', 'status', 'last_login_at', 'notification_prefs',
        'app_role', 'app_permissions', 'equipe_residence_ids',
        'cndp_consent_at', 'cndp_policy_version',
    ];

    protected $hidden = [
        'password', 'access_code', 'remember_token', 'otp_code',
        'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'otp_expires_at' => 'datetime',
            'last_login_at' => 'datetime',
            'must_change_code' => 'boolean',
            'must_change_password' => 'boolean',
            'notification_prefs' => 'array',
            'app_permissions' => 'array',
            'equipe_residence_ids' => 'array',
            'cndp_consent_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /** La 2FA est-elle activée et confirmée pour ce compte ? */
    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null && $this->two_factor_secret !== null;
    }

    /** La 2FA est-elle obligatoire pour ce compte ? (tous les super_admin — KAN-147) */
    public function requiresTwoFactor(): bool
    {
        return $this->role === 'super_admin';
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class, 'id', 'user_id');
    }

    public function coproprietaires(): HasMany
    {
        return $this->hasMany(Coproprietaire::class);
    }

    public function residences(): HasMany
    {
        return $this->hasMany(Residence::class, 'gestionnaire_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function notificationsLog(): HasMany
    {
        return $this->hasMany(NotificationLog::class);
    }

    public function isOtpValid(string $otp): bool
    {
        return $this->otp_code === hash('sha256', $otp)
            && $this->otp_expires_at?->isFuture();
    }
}
