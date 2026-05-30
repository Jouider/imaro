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
        'tenant_id', 'name', 'phone', 'email', 'password',
        'access_code', 'must_change_code',
        'role', 'otp_code', 'otp_expires_at', 'lang',
        'avatar', 'status', 'last_login_at', 'notification_prefs',
        'app_role', 'app_permissions', 'equipe_residence_ids',
    ];

    protected $hidden = [
        'password', 'access_code', 'remember_token', 'otp_code',
    ];

    protected function casts(): array
    {
        return [
            'otp_expires_at'       => 'datetime',
            'last_login_at'        => 'datetime',
            'must_change_code'     => 'boolean',
            'notification_prefs'   => 'array',
            'app_permissions'      => 'array',
            'equipe_residence_ids' => 'array',
        ];
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
