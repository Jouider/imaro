<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #1f2937; font-size: 12px; margin: 0; padding: 32px; }
        .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 24px; }
        .header h1 { color: #1e3a5f; margin: 0; font-size: 22px; }
        .header .sub { color: #6b7280; font-size: 11px; margin-top: 4px; }
        .title { text-align: center; font-size: 16px; font-weight: bold; color: #1e3a5f; margin: 18px 0; }
        .ref { text-align: center; color: #6b7280; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
        td.label { color: #6b7280; width: 40%; }
        td.value { font-weight: bold; }
        .montant { background: #f0f7ff; border: 2px solid #1e3a5f; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px; }
        .montant .amt { font-size: 24px; font-weight: bold; color: #1e3a5f; }
        .footer { margin-top: 40px; color: #9ca3af; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant?->name ?? 'imaro' }}</h1>
        <div class="sub">
            {{ $residence?->name ?? '' }}@if($residence?->address) — {{ $residence->address }}@endif
            @if($residence?->city), {{ $residence->city }}@endif
        </div>
    </div>

    <div class="title">REÇU DE PAIEMENT</div>
    <div class="ref">N° REC-{{ $paiement->date_paiement?->format('Y') ?? date('Y') }}-{{ str_pad($paiement->id, 5, '0', STR_PAD_LEFT) }}</div>

    <table>
        <tr><td class="label">Copropriétaire</td><td class="value">{{ $copro?->user?->name ?? '—' }}</td></tr>
        <tr><td class="label">Lot</td><td class="value">{{ $lot?->numero ?? '—' }}</td></tr>
        <tr><td class="label">Date du paiement</td><td class="value">{{ $paiement->date_paiement?->format('d/m/Y') ?? '—' }}</td></tr>
        <tr><td class="label">Mode de règlement</td><td class="value">{{ ucfirst($paiement->mode ?? 'virement') }}</td></tr>
        @if($paiement->reference)
        <tr><td class="label">Référence</td><td class="value">{{ $paiement->reference }}</td></tr>
        @endif
    </table>

    <div class="montant">
        <div class="sub" style="color:#6b7280; font-size:11px;">Montant réglé</div>
        <div class="amt">{{ number_format((float) $paiement->montant, 2, ',', ' ') }} DH</div>
    </div>

    <div class="footer">
        Reçu généré le {{ now()->format('d/m/Y à H:i') }} — Document conforme à la Loi 18-00 relative au statut de la copropriété des immeubles bâtis.
        Conservation obligatoire 5 ans (Décret 2.23.700).
    </div>
</body>
</html>
