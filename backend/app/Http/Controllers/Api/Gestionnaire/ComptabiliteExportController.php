<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Exercice;
use App\Services\Comptabilite\ComptabiliteExportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Exports comptables (KAN-100) : Journal/Grand-Livre .xlsx, FEC, Journal/Balance PDF.
 * Réutilise ComptabiliteExportService (même données que les vues JSON).
 */
class ComptabiliteExportController extends Controller
{
    public function __construct(private readonly ComptabiliteExportService $service) {}

    private function guard(Request $request, Exercice $exercice): void
    {
        $residence = $exercice->residence;
        $isManager = $request->user()->role === 'manager';
        $isGestionnaire = $residence->gestionnaire_id === $request->user()->id;
        abort_if(! $isManager && ! $isGestionnaire, 403, 'Accès refusé.');
    }

    private function label(Exercice $exercice): string
    {
        return ($exercice->residence?->name ?? 'Résidence').' — Exercice '.$exercice->annee;
    }

    /** GET …/export/journal.xlsx */
    public function journalXlsx(Request $request, Exercice $exercice): StreamedResponse
    {
        $this->guard($request, $exercice);

        $ss = new Spreadsheet;
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Journal');
        $sheet->fromArray(['Date', 'Compte', 'Libellé compte', 'Description', 'Débit', 'Crédit', 'Pièce'], null, 'A1');

        $r = 2;
        foreach ($this->service->journalRows($exercice) as $row) {
            $sheet->fromArray([
                $row['date'], $row['numero_compte'], $row['libelle_compte'],
                $row['description'], $row['debit'], $row['credit'], $row['piece'],
            ], null, 'A'.$r++);
        }

        return $this->streamXlsx($ss, "journal-{$exercice->annee}.xlsx");
    }

    /** GET …/export/grand-livre.xlsx */
    public function grandLivreXlsx(Request $request, Exercice $exercice): StreamedResponse
    {
        $this->guard($request, $exercice);

        $ss = new Spreadsheet;
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Grand-Livre');
        $sheet->fromArray(['Compte', 'Libellé', 'Date', 'Description', 'Débit', 'Crédit', 'Solde'], null, 'A1');

        $r = 2;
        foreach ($this->service->grandLivreComptes($exercice) as $c) {
            $sheet->fromArray([$c['numero'], $c['libelle']], null, 'A'.$r++);
            foreach ($c['lignes'] as $l) {
                $sheet->fromArray(['', '', $l['date'], $l['description'], $l['debit'], $l['credit'], $l['solde']], null, 'A'.$r++);
            }
            $sheet->fromArray(['', 'Totaux', '', '', $c['total_debit'], $c['total_credit'], $c['solde_final']], null, 'A'.$r++);
            $r++; // ligne vide entre comptes
        }

        return $this->streamXlsx($ss, "grand-livre-{$exercice->annee}.xlsx");
    }

    /** GET …/export/fec — Fichier des Écritures Comptables (tabulé, norme DGFiP). */
    public function fec(Request $request, Exercice $exercice): Response
    {
        $this->guard($request, $exercice);

        $rows = $this->service->fecRows($exercice);
        $headers = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'];

        $lines = [implode("\t", $headers)];
        foreach ($rows as $row) {
            $lines[] = implode("\t", array_values($row));
        }
        $content = implode("\r\n", $lines)."\r\n";

        $name = "FEC-{$exercice->annee}.txt";

        return response($content, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    /** GET …/export/journal.pdf */
    public function journalPdf(Request $request, Exercice $exercice): Response
    {
        $this->guard($request, $exercice);

        $rows = $this->service->journalRows($exercice);
        $pdf = Pdf::loadView('pdf.comptabilite.journal', [
            'titre' => $this->label($exercice),
            'rows' => $rows,
            'totalDebit' => array_sum(array_column($rows, 'debit')),
            'totalCredit' => array_sum(array_column($rows, 'credit')),
        ])->setPaper('a4', 'landscape');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="journal-'.$exercice->annee.'.pdf"',
        ]);
    }

    /** GET …/export/balance.pdf */
    public function balancePdf(Request $request, Exercice $exercice): Response
    {
        $this->guard($request, $exercice);

        $rows = $this->service->balanceRows($exercice);
        $pdf = Pdf::loadView('pdf.comptabilite.balance', [
            'titre' => $this->label($exercice),
            'rows' => $rows,
            'totalDebit' => array_sum(array_column($rows, 'total_debit')),
            'totalCredit' => array_sum(array_column($rows, 'total_credit')),
        ])->setPaper('a4');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="balance-'.$exercice->annee.'.pdf"',
        ]);
    }

    private function streamXlsx(Spreadsheet $ss, string $name): StreamedResponse
    {
        $writer = new Xlsx($ss);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $name, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
