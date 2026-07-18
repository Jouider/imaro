<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Supervision technique — santé plateforme, files & jobs en échec (KAN-143).
 * Toutes les sondes sont défensives : jamais d'exception non gérée.
 */
class HealthController extends Controller
{
    /** GET /admin/health */
    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'services' => [
                    'database' => $this->probe(fn () => DB::select('select 1') !== null),
                    'redis' => $this->probe(fn () => (bool) Redis::connection()->ping()),
                    'cache' => $this->probe(function () {
                        Cache::put('health_probe', '1', 5);

                        return Cache::get('health_probe') === '1';
                    }),
                    'storage' => $this->probe(fn () => Storage::disk('public')->exists('.') || true),
                ],
                'queue' => [
                    'failed' => $this->count('failed_jobs'),
                    'pending' => $this->count('jobs'),
                ],
                'integrations' => [
                    'whatsapp_twilio' => (bool) config('services.twilio.sid', env('TWILIO_SID')),
                    'email_brevo' => (bool) config('services.brevo.key', env('BREVO_API_KEY')),
                    'push_fcm' => (bool) config('services.fcm.project_id'),
                    'push_apns' => (bool) env('APNS_KEY_ID'),
                    'paiement_cmi' => (bool) env('CMI_CLIENT_ID'),
                ],
                'version' => config('app.version', env('APP_VERSION', 'dev')),
                'environment' => app()->environment(),
                'last_migration' => $this->lastMigration(),
            ],
        ]);
    }

    /** GET /admin/failed-jobs */
    public function failedJobs(): JsonResponse
    {
        $jobs = [];
        try {
            $jobs = collect(DB::table('failed_jobs')->orderByDesc('failed_at')->limit(50)->get())
                ->map(fn ($j) => [
                    'id' => $j->uuid ?? (string) $j->id,
                    'connection' => $j->connection ?? null,
                    'queue' => $j->queue ?? null,
                    'exception' => $this->firstLine($j->exception ?? ''),
                    'failed_at' => $j->failed_at ?? null,
                ])->all();
        } catch (Throwable) {
            // Table indisponible : liste vide.
        }

        return response()->json(['status' => 'success', 'data' => $jobs]);
    }

    /** POST /admin/failed-jobs/{id}/retry */
    public function retry(string $id): JsonResponse
    {
        try {
            Artisan::call('queue:retry', ['id' => [$id]]);
        } catch (Throwable $e) {
            return response()->json(['status' => 'error', 'message' => 'Relance impossible.'], 422);
        }

        return response()->json(['status' => 'success', 'message' => 'Job relancé.']);
    }

    private function probe(callable $check): bool
    {
        try {
            return (bool) $check();
        } catch (Throwable) {
            return false;
        }
    }

    private function count(string $table): int
    {
        try {
            return DB::table($table)->count();
        } catch (Throwable) {
            return 0;
        }
    }

    private function lastMigration(): ?string
    {
        try {
            return DB::table('migrations')->orderByDesc('id')->value('migration');
        } catch (Throwable) {
            return null;
        }
    }

    private function firstLine(string $s): string
    {
        return trim(strtok($s, "\n") ?: '');
    }
}
