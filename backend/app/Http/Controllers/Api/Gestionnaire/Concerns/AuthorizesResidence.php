<?php

namespace App\Http\Controllers\Api\Gestionnaire\Concerns;

use App\Models\Residence;
use Illuminate\Http\Request;

trait AuthorizesResidence
{
    /**
     * Returns true if the authenticated user can access the given residence.
     * Manager sees all residences; gestionnaire sees only assigned ones.
     */
    protected function canAccessResidence(Request $request, Residence $residence): bool
    {
        if ($request->user()->hasRole('manager')) {
            return true;
        }

        return $residence->gestionnaire_id === $request->user()->id;
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
        if ($request->user()->hasRole('manager')) {
            return fn ($q) => $q;
        }

        return fn ($q) => $q->where('gestionnaire_id', $request->user()->id);
    }

    /**
     * Returns the IDs of residences accessible by the user.
     */
    protected function accessibleResidenceIds(Request $request): \Illuminate\Support\Collection
    {
        $query = Residence::query();

        if (! $request->user()->hasRole('manager')) {
            $query->where('gestionnaire_id', $request->user()->id);
        }

        return $query->pluck('id');
    }
}
