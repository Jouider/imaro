<?php

namespace App\Http\Controllers\Api\Gestionnaire\Concerns;

use App\Models\Residence;
use Illuminate\Http\Request;

trait AuthorizesResidence
{
    /**
     * Returns true if the authenticated user can access the given residence.
     * Manager sees all. Equipe gestionnaire scoped by equipe_residence_ids.
     * Legacy gestionnaire scoped by residences.gestionnaire_id.
     */
    protected function canAccessResidence(Request $request, Residence $residence): bool
    {
        $user = $request->user();

        if ($user->hasRole('manager')) {
            return true;
        }

        if (! empty($user->equipe_residence_ids)) {
            return in_array($residence->id, $user->equipe_residence_ids);
        }

        return $residence->gestionnaire_id === $user->id;
    }

    protected function authorizeResidence(Request $request, Residence $residence): void
    {
        abort_if(
            ! $this->canAccessResidence($request, $residence),
            403,
            'Cette résidence ne vous est pas assignée.'
        );
    }

    /**
     * Returns an Eloquent scope that restricts residences to those accessible by the user.
     */
    protected function residenceScope(Request $request): \Closure
    {
        $user = $request->user();

        if ($user->hasRole('manager')) {
            return fn ($q) => $q;
        }

        if (! empty($user->equipe_residence_ids)) {
            return fn ($q) => $q->whereIn('id', $user->equipe_residence_ids);
        }

        return fn ($q) => $q->where('gestionnaire_id', $user->id);
    }

    /**
     * Returns the IDs of residences accessible by the user.
     */
    protected function accessibleResidenceIds(Request $request): \Illuminate\Support\Collection
    {
        $user = $request->user();

        if ($user->hasRole('manager')) {
            return Residence::pluck('id');
        }

        if (! empty($user->equipe_residence_ids)) {
            return collect($user->equipe_residence_ids);
        }

        return Residence::where('gestionnaire_id', $user->id)->pluck('id');
    }
}
