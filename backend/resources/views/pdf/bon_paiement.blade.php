<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #1f2937; font-size: 12px; margin: 0; }
        .page { padding: 34px; }
        .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 18px; }
        .header h1 { color: #1e3a5f; margin: 0; font-size: 20px; }
        .header .sub { color: #6b7280; font-size: 11px; margin-top: 3px; }
        .title { text-align: center; font-size: 16px; font-weight: bold; color: #1e3a5f; margin: 16px 0 4px; }
        .ref { text-align: center; color: #6b7280; margin-bottom: 18px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.info td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
        td.label { color: #6b7280; width: 38%; }
        td.value { font-weight: bold; }
        .montant { font-size: 18px; color: #1e3a5f; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 11px; font-weight: bold; }
        .legal { margin-top: 14px; font-size: 10px; color: #6b7280; }
        .foot { margin-top: 26px; color: #9ca3af; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <h1>{{ $tenant?->name ?? 'imaro' }}</h1>
            <div class="sub">
                {{ trim(($residence?->name ?? '').($residence?->address ? ' — '.$residence->address : '').($residence?->city ? ', '.$residence->city : '')) }}
            </div>
        </div>

        <div class="title">BON DE PAIEMENT</div>
        <div class="ref">Référence : {{ $bon->reference }}</div>

        <table class="info">
            <tr><td class="label">Émetteur (copropriétaire)</td><td class="value">{{ $copro?->user?->name ?? '—' }}</td></tr>
            <tr><td class="label">Lot</td><td class="value">{{ $lot?->numero ?? '—' }}</td></tr>
            <tr><td class="label">Compte émetteur</td><td class="value">{{ $bon->compte_emetteur }}</td></tr>
            <tr><td class="label">Bénéficiaire</td><td class="value">{{ $bon->beneficiaire }}</td></tr>
            <tr><td class="label">Montant</td><td class="value montant">{{ number_format((float) $bon->montant, 2, ',', ' ') }} DH</td></tr>
            <tr><td class="label">Motif</td><td class="value">{{ $bon->motif }}</td></tr>
            <tr><td class="label">Émis le</td><td class="value">{{ $bon->created_at?->format('d/m/Y à H:i') ?? '—' }}</td></tr>
            <tr><td class="label">Validé le</td><td class="value">{{ $bon->validated_at?->format('d/m/Y à H:i') ?? '—' }}</td></tr>
            <tr><td class="label">Statut</td><td class="value"><span class="badge">Validé</span></td></tr>
            @if ($bon->ticket?->reference)
                <tr><td class="label">Ticket de suivi</td><td class="value">{{ $bon->ticket->reference }}</td></tr>
            @endif
        </table>

        <div class="legal">
            Bon de paiement validé par le syndic après le délai minimal de 24 heures suivant son émission.
            Document à conserver 5 ans (Décret 2.23.700).
        </div>

        <div class="foot">{{ $tenant?->name ?? 'imaro' }} — document généré le {{ now()->format('d/m/Y à H:i') }}.</div>
    </div>
</body>
</html>
