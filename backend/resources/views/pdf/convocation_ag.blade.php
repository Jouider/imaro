<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #1f2937; font-size: 12px; margin: 0; }
        .page { padding: 34px; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 18px; }
        .header h1 { color: #1e3a5f; margin: 0; font-size: 20px; }
        .header .sub { color: #6b7280; font-size: 11px; margin-top: 3px; }
        .title { text-align: center; font-size: 15px; font-weight: bold; color: #1e3a5f; margin: 16px 0 4px; }
        .sub-title { text-align: center; color: #6b7280; margin-bottom: 18px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.info td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
        td.label { color: #6b7280; width: 38%; }
        td.value { font-weight: bold; }
        .section-h { font-weight: bold; color: #1e3a5f; margin: 16px 0 6px; }
        .odj { white-space: pre-line; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #f9fafb; }
        .legal { margin-top: 14px; font-size: 10px; color: #6b7280; }
        .pouvoir { margin-top: 22px; border: 1px dashed #9ca3af; border-radius: 6px; padding: 14px; }
        .pouvoir h3 { margin: 0 0 8px; font-size: 13px; color: #1e3a5f; }
        .line { border-bottom: 1px solid #9ca3af; height: 16px; margin: 10px 0; }
        .foot { margin-top: 26px; color: #9ca3af; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
@foreach ($convocations as $c)
    <div class="page">
        <div class="header">
            <h1>{{ $tenant?->name ?? 'imaro' }}</h1>
            <div class="sub">
                {{ trim(($residence?->name ?? '').($residence?->address ? ' — '.$residence->address : '').($residence?->city ? ', '.$residence->city : '')) }}
            </div>
        </div>

        <div class="title">CONVOCATION À L'ASSEMBLÉE GÉNÉRALE</div>
        <div class="sub-title">{{ ($assemblee->type ?? 'ordinaire') === 'extraordinaire' ? 'Assemblée générale extraordinaire' : 'Assemblée générale ordinaire' }}</div>

        <table class="info">
            <tr><td class="label">Copropriétaire</td><td class="value">{{ $c['nom'] }}</td></tr>
            <tr><td class="label">Lot</td><td class="value">{{ $c['lot'] ?? '—' }}</td></tr>
            <tr><td class="label">Quote-part (tantièmes)</td><td class="value">{{ $c['tantieme'] }} / 1000</td></tr>
            <tr><td class="label">Date & heure</td><td class="value">{{ $assemblee->date?->format('d/m/Y à H:i') ?? '—' }}</td></tr>
            <tr><td class="label">Lieu</td><td class="value">{{ $assemblee->lieu ?? '—' }}</td></tr>
            <tr><td class="label">Quorum requis</td><td class="value">{{ $assemblee->quorum_requis ?? 50 }} %</td></tr>
        </table>

        <div class="section-h">Ordre du jour</div>
        <div class="odj">{{ $assemblee->ordre_du_jour ?: 'À préciser.' }}</div>

        <div class="legal">
            Convocation adressée dans le respect du délai légal de <strong>15 jours</strong> minimum
            avant la tenue de l'assemblée (Loi 18-00, art. 16quinquies). Document à conserver 5 ans (Décret 2.23.700).
        </div>

        <div class="pouvoir">
            <h3>Pouvoir / Procuration</h3>
            <p>Je soussigné(e) <strong>{{ $c['nom'] }}</strong> (lot {{ $c['lot'] ?? '—' }}), donne pouvoir à :</p>
            <div class="line"></div>
            <p>pour me représenter et voter en mon nom à l'assemblée générale du
               {{ $assemblee->date?->format('d/m/Y') ?? '…' }}.</p>
            <p style="margin-top:14px;">Fait à ………………………, le ………………………</p>
            <p style="margin-top:18px;">Signature : ………………………………………</p>
        </div>

        <div class="foot">{{ $tenant?->name ?? 'imaro' }} — convocation générée le {{ now()->format('d/m/Y à H:i') }}.</div>
    </div>
@endforeach
</body>
</html>
