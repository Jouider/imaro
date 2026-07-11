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
    <h1>Journal comptable</h1>
    <div class="sub">{{ $titre }} · édité le {{ now()->format('d/m/Y') }}</div>

    <table>
        <thead>
            <tr>
                <th>Date</th><th>Compte</th><th>Libellé compte</th><th>Description</th>
                <th class="num">Débit</th><th class="num">Crédit</th><th>Pièce</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $r)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($r['date'])->format('d/m/Y') }}</td>
                    <td>{{ $r['numero_compte'] }}</td>
                    <td>{{ $r['libelle_compte'] }}</td>
                    <td>{{ $r['description'] }}</td>
                    <td class="num">{{ $r['debit'] ? number_format($r['debit'], 2, ',', ' ') : '' }}</td>
                    <td class="num">{{ $r['credit'] ? number_format($r['credit'], 2, ',', ' ') : '' }}</td>
                    <td>{{ $r['piece'] }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="4">Totaux</td>
                <td class="num">{{ number_format($totalDebit, 2, ',', ' ') }}</td>
                <td class="num">{{ number_format($totalCredit, 2, ',', ' ') }}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div class="law">Document comptable établi conformément au Décret 2.23.700 (règles comptables des syndicats) — Loi 18-00.</div>
</body>
</html>
