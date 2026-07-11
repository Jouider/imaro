<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssistanceRequest extends Model
{
    protected $fillable = [
        'tenant_id', 'reference', 'contact_name', 'contact_phone', 'contact_email',
        'syndic_name', 'residences_count', 'impayes_estimate', 'plan', 'message',
        'statut', 'created_by',
    ];
}
