<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 10px; color: #1a1a2e; }
        h1 { font-size: 15px; margin: 0 0 2px; }
        .sub { color: #666; font-size: 9px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 6px; border-bottom: 1px solid #e2e2ec; text-align: left; }
        th { background: #f3f4f8; font-size: 9px; text-transform: uppercase; }
        td.num, th.num { text-align: right; }
        tfoot td { font-weight: bold; border-top: 2px solid #1a1a2e; }
        .law { margin-top: 14px; font-size: 8px; color: #999; }
    </style>
</head>
<body>
    <h1>Balance des comptes</h1>
    <div class="sub">{{ $titre }} · édité le {{ now()->format('d/m/Y') }}</div>

    <table>
        <thead>
            <tr>
                <th>Compte</th><th>Libellé</th><th class="num">Cl.</th>
                <th class="num">Total débit</th><th class="num">Total crédit</th>
                <th class="num">Solde débiteur</th><th class="num">Solde créditeur</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $r)
                <tr>
                    <td>{{ $r['numero'] }}</td>
                    <td>{{ $r['libelle'] }}</td>
                    <td class="num">{{ $r['classe'] }}</td>
                    <td class="num">{{ number_format($r['total_debit'], 2, ',', ' ') }}</td>
                    <td class="num">{{ number_format($r['total_credit'], 2, ',', ' ') }}</td>
                    <td class="num">{{ $r['solde_debiteur'] ? number_format($r['solde_debiteur'], 2, ',', ' ') : '' }}</td>
                    <td class="num">{{ $r['solde_crediteur'] ? number_format($r['solde_crediteur'], 2, ',', ' ') : '' }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3">Totaux</td>
                <td class="num">{{ number_format($totalDebit, 2, ',', ' ') }}</td>
                <td class="num">{{ number_format($totalCredit, 2, ',', ' ') }}</td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>

    <div class="law">Document comptable établi conformément au Décret 2.23.700 (règles comptables des syndicats) — Loi 18-00.</div>
</body>
</html>
