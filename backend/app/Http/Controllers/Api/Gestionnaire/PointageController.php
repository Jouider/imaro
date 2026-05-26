<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Depense;
use App\Models\Paiement;
use App\Models\PointageLineMatch;
use App\Models\PointageSession;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PointageController extends Controller
{
    /**
     * POST /api/gestionnaire/residences/{residence}/pointage/sessions
     *
     * Accept a CSV/Excel upload (or JSON lines for the demo path),
     * parse it, store the session, and return parsed lines with totals.
     */
    public function createSession(Request $request, Residence $residence): JsonResponse
    {
        $request->validate([
            'banque' => 'required|string|max:100',
            'file'   => 'required_without:lines|file|mimes:csv,txt,xlsx,xls',
            'lines'  => 'required_without:file|array',
            'lines.*.date'    => 'required_with:lines|string',
            'lines.*.libelle' => 'required_with:lines|string',
            'lines.*.debit'   => 'nullable|numeric',
            'lines.*.credit'  => 'nullable|numeric',
        ]);

        if ($request->hasFile('file')) {
            $path  = $request->file('file')->store('pointage', 'local');
            $lines = $this->parseFile($request->file('file')->getRealPath(), $request->banque);
        } else {
            $path  = null;
            $lines = collect($request->lines)->map(fn ($l, $i) => [
                'index'   => $i,
                'hash'    => md5($l['date'] . $l['libelle'] . ($l['debit'] ?? 0) . ($l['credit'] ?? 0)),
                'date'    => $l['date'],
                'libelle' => $l['libelle'],
                'debit'   => round((float) ($l['debit'] ?? 0), 2),
                'credit'  => round((float) ($l['credit'] ?? 0), 2),
            ])->values()->toArray();
        }

        $totalDebit  = array_sum(array_column($lines, 'debit'));
        $totalCredit = array_sum(array_column($lines, 'credit'));

        $session = PointageSession::create([
            'tenant_id'    => $request->user()->tenant_id,
            'residence_id' => $residence->id,
            'created_by'   => $request->user()->id,
            'banque'       => $request->banque,
            'file_path'    => $path,
            'totals'       => [
                'total_lines'  => count($lines),
                'total_debit'  => round($totalDebit, 2),
                'total_credit' => round($totalCredit, 2),
            ],
            'lines' => $lines,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => count($lines) . ' lignes bancaires importées.',
            'data'    => [
                'session_id'   => $session->id,
                'totalLines'   => count($lines),
                'totalDebit'   => round($totalDebit, 2),
                'totalCredit'  => round($totalCredit, 2),
                'lines'        => $lines,
            ],
        ], 201);
    }

    /**
     * GET /api/gestionnaire/residences/{residence}/pointage/sessions/{session}/candidates
     *
     * Return paiements + dépenses that can be matched against bank lines.
     */
    public function candidates(Request $request, Residence $residence, PointageSession $session): JsonResponse
    {
        abort_if($session->residence_id !== $residence->id, 404);

        $paiements = Paiement::where('tenant_id', $session->tenant_id)
            ->whereHas('appelFondsLigne.appelFonds', fn ($q) => $q->where('residence_id', $residence->id))
            ->with('coproprietaire.user')
            ->orderByDesc('date_paiement')
            ->get()
            ->map(fn (Paiement $p) => [
                'type'     => 'paiement',
                'id'       => $p->id,
                'date'     => $p->date_paiement->toDateString(),
                'libelle'  => 'Paiement ' . ($p->coproprietaire?->user?->name ?? 'N/A'),
                'montant'  => round($p->montant, 2),
                'reference'=> $p->reference,
            ]);

        $depenses = Depense::where('residence_id', $residence->id)
            ->where('statut', '!=', 'annule')
            ->orderByDesc('date')
            ->get()
            ->map(fn (Depense $d) => [
                'type'     => 'depense',
                'id'       => $d->id,
                'date'     => $d->date->toDateString(),
                'libelle'  => $d->description,
                'montant'  => round($d->montant, 2),
                'reference'=> 'DEP-' . $d->id,
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'candidates' => $paiements->concat($depenses)->values(),
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/residences/{residence}/pointage/sessions/{session}/matches/confirm
     *
     * Confirm matches between bank lines and paiements/dépenses.
     */
    public function confirmMatches(Request $request, Residence $residence, PointageSession $session): JsonResponse
    {
        abort_if($session->residence_id !== $residence->id, 404);

        $request->validate([
            'matches'              => 'required|array|min:1',
            'matches.*.bankLineId' => 'required|string',
            'matches.*.targetType' => 'required|in:paiement,depense',
            'matches.*.targetId'   => 'required|integer',
        ]);

        $confirmed = DB::transaction(function () use ($request, $session) {
            $created = [];

            foreach ($request->matches as $match) {
                $created[] = PointageLineMatch::updateOrCreate(
                    [
                        'session_id'     => $session->id,
                        'bank_line_hash' => $match['bankLineId'],
                    ],
                    [
                        'target_type'  => $match['targetType'],
                        'target_id'    => $match['targetId'],
                        'confirmed_at' => now(),
                        'confirmed_by' => $request->user()->id,
                    ]
                );
            }

            return $created;
        });

        return response()->json([
            'status'  => 'success',
            'message' => count($confirmed) . ' rapprochements confirmés.',
            'data'    => [
                'confirmed_count' => count($confirmed),
            ],
        ]);
    }

    // ── CSV Parser ──────────────────────────────────────────

    private function parseFile(string $filePath, string $banque): array
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        if (in_array($extension, ['csv', 'txt'])) {
            return $this->parseCsv($filePath);
        }

        // For Excel files, fall back to CSV-like parsing if no PhpSpreadsheet
        // In production, you'd use maatwebsite/excel or PhpSpreadsheet
        return $this->parseCsv($filePath);
    }

    private function parseCsv(string $filePath): array
    {
        $lines = [];
        $handle = fopen($filePath, 'r');

        if (! $handle) {
            return [];
        }

        // Detect delimiter
        $firstLine = fgets($handle);
        rewind($handle);
        $delimiter = str_contains($firstLine, ';') ? ';' : ',';

        $header = fgetcsv($handle, 0, $delimiter);
        if (! $header) {
            fclose($handle);
            return [];
        }

        $header = array_map(fn ($h) => $this->normalizeHeader($h), $header);

        $dateCol    = $this->findColumn($header, ['date', 'date_operation', 'date_valeur']);
        $libelleCol = $this->findColumn($header, ['libelle', 'libellé', 'description', 'motif', 'intitule']);
        $debitCol   = $this->findColumn($header, ['debit', 'débit', 'montant_debit']);
        $creditCol  = $this->findColumn($header, ['credit', 'crédit', 'montant_credit']);
        $montantCol = $this->findColumn($header, ['montant', 'amount']);
        $sensCol    = $this->findColumn($header, ['sens', 'type', 'dc', 'd/c']);

        $idx = 0;
        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            if (count($row) <= 1 && empty(trim($row[0] ?? ''))) {
                continue;
            }

            $date    = $dateCol !== null ? $this->parseDate($row[$dateCol] ?? '') : '';
            $libelle = $libelleCol !== null ? trim($row[$libelleCol] ?? '') : '';
            $debit   = 0.0;
            $credit  = 0.0;

            if ($debitCol !== null && $creditCol !== null) {
                $debit  = $this->parseAmount($row[$debitCol] ?? '');
                $credit = $this->parseAmount($row[$creditCol] ?? '');
            } elseif ($montantCol !== null) {
                $amount = $this->parseAmount($row[$montantCol] ?? '');
                $sens   = $sensCol !== null ? strtoupper(trim($row[$sensCol] ?? '')) : '';

                if ($sens === 'D' || $sens === 'DEBIT' || $amount < 0) {
                    $debit = abs($amount);
                } else {
                    $credit = abs($amount);
                }
            }

            if (empty($date) && empty($libelle) && $debit == 0 && $credit == 0) {
                continue;
            }

            $lines[] = [
                'index'   => $idx,
                'hash'    => md5($date . $libelle . $debit . $credit . $idx),
                'date'    => $date,
                'libelle' => $libelle,
                'debit'   => round($debit, 2),
                'credit'  => round($credit, 2),
            ];
            $idx++;
        }

        fclose($handle);

        return $lines;
    }

    private function normalizeHeader(string $h): string
    {
        $h = mb_strtolower(trim($h));
        $h = str_replace(["\xEF\xBB\xBF", '"'], '', $h); // BOM + quotes
        $h = preg_replace('/[^a-z0-9_\/]/', '_', Str::ascii($h));

        return $h;
    }

    private function findColumn(array $headers, array $aliases): ?int
    {
        foreach ($aliases as $alias) {
            $normalized = preg_replace('/[^a-z0-9_]/', '_', Str::ascii(mb_strtolower($alias)));
            foreach ($headers as $i => $h) {
                if ($h === $normalized || str_contains($h, $normalized)) {
                    return $i;
                }
            }
        }

        return null;
    }

    private function parseDate(string $raw): string
    {
        $raw = trim($raw);
        if (empty($raw)) {
            return '';
        }

        // DD/MM/YYYY (French format)
        if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', $raw, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }

        // YYYY-MM-DD (ISO)
        if (preg_match('#^\d{4}-\d{2}-\d{2}$#', $raw)) {
            return $raw;
        }

        // Try generic parse
        $ts = strtotime($raw);
        return $ts ? date('Y-m-d', $ts) : $raw;
    }

    private function parseAmount(string $raw): float
    {
        $raw = trim($raw);
        if (empty($raw)) {
            return 0.0;
        }

        // French number format: 1 500,00 → 1500.00
        $raw = str_replace([' ', "\xC2\xA0"], '', $raw); // regular space + nbsp
        $raw = str_replace(',', '.', $raw);
        $raw = preg_replace('/[^0-9.\-]/', '', $raw);

        return (float) $raw;
    }
}
