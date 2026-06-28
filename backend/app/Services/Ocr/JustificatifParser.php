<?php

namespace App\Services\Ocr;

/**
 * Extrait, par heuristiques, les champs d'un justificatif de paiement (virement,
 * versement, chèque, reçu bancaire) à partir du texte OCR brut. Best-effort :
 * tout champ non trouvé reste null → le résident le complète à la main.
 */
class JustificatifParser
{
    /**
     * @return array{montant: float|null, date: string|null, methode: string|null, reference: string|null}
     */
    public function parse(string $text): array
    {
        return [
            'montant' => $this->montant($text),
            'date' => $this->date($text),
            'methode' => $this->methode($text),
            'reference' => $this->reference($text),
        ];
    }

    private function montant(string $text): ?float
    {
        // Montants suivis d'une devise (DH / DHS / MAD / Dirham) — les plus fiables.
        // Capture permissive (chiffres + séparateurs espace/point/virgule) ; la
        // normalisation tranche ensuite milliers vs décimales.
        if (preg_match_all('/(\d[\d .,]*\d|\d)\s*(?:dhs?|mad|dirhams?)\b/iu', $text, $m)) {
            $candidats = array_map(fn ($v) => $this->normaliserMontant($v), $m[1]);
            $candidats = array_filter($candidats, fn ($v) => $v !== null && $v > 0);
            if ($candidats) {
                return max($candidats); // le plus gros montant en devise = le montant payé
            }
        }

        // Sinon, un montant proche du mot « montant ».
        if (preg_match('/montant[^0-9]{0,20}(\d[\d .,]*\d|\d)/iu', $text, $m)) {
            return $this->normaliserMontant($m[1]);
        }

        return null;
    }

    private function date(string $text): ?string
    {
        // jj/mm/aaaa, jj-mm-aaaa, jj.mm.aaaa
        if (preg_match_all('/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/', $text, $sets, PREG_SET_ORDER)) {
            foreach ($sets as $s) {
                $d = (int) $s[1];
                $mo = (int) $s[2];
                $y = (int) $s[3];
                $y = $y < 100 ? 2000 + $y : $y;
                if (checkdate($mo, $d, $y)) {
                    return sprintf('%04d-%02d-%02d', $y, $mo, $d);
                }
            }
        }

        // aaaa-mm-jj (ISO)
        if (preg_match('/\b(\d{4})-(\d{2})-(\d{2})\b/', $text, $m)
            && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return "{$m[1]}-{$m[2]}-{$m[3]}";
        }

        return null;
    }

    private function methode(string $text): ?string
    {
        $t = mb_strtolower($text);

        return match (true) {
            str_contains($t, 'versement') => 'versement',
            str_contains($t, 'virement') => 'virement',
            str_contains($t, 'chèque') || str_contains($t, 'cheque') => 'cheque',
            str_contains($t, 'espèce') || str_contains($t, 'espece') || str_contains($t, 'cash') => 'especes',
            default => null,
        };
    }

    private function reference(string $text): ?string
    {
        // Uniquement de VRAIS libellés de référence (référence, réf., bordereau,
        // transaction). On NE déclenche PAS sur un « N° » seul : « Compte N° »,
        // « N° de compte » = numéros de compte/RIB, à ne jamais prendre pour une
        // référence de virement.
        if (preg_match('/(?:r[ée]f[ée]rence|r[ée]f\.|bordereau|transaction)\s*(?:n[°o]\.?)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-]{3,})/iu', $text, $m)) {
            return strtoupper(trim($m[1], '/-'));
        }

        return null;
    }

    /** Normalise « 1 500,00 » / « 1.500,00 » / « 1,500.00 » / « 1500 » → float. */
    private function normaliserMontant(string $raw): ?float
    {
        $s = preg_replace('/\s/', '', $raw);
        if ($s === null || $s === '') {
            return null;
        }

        $hasDot = str_contains($s, '.');
        $hasComma = str_contains($s, ',');

        if ($hasDot && $hasComma) {
            // Le dernier séparateur est le décimal.
            if (strrpos($s, ',') > strrpos($s, '.')) {
                $s = str_replace('.', '', $s);   // point = milliers
                $s = str_replace(',', '.', $s);
            } else {
                $s = str_replace(',', '', $s);   // virgule = milliers
            }
        } elseif ($hasComma) {
            // Virgule seule : décimale si 1-2 chiffres après, sinon milliers.
            $s = preg_match('/,\d{1,2}$/', $s) ? str_replace(',', '.', $s) : str_replace(',', '', $s);
        } elseif ($hasDot) {
            // Point seul : milliers si 3 chiffres après (ex. 1.500), sinon décimal.
            if (preg_match('/\.\d{3}$/', $s)) {
                $s = str_replace('.', '', $s);
            }
        }

        return is_numeric($s) ? round((float) $s, 2) : null;
    }
}
