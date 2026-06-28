<?php

namespace App\Services\Ocr;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Extraction OCR d'un justificatif de paiement (image ou PDF), 100% offline.
 * Best-effort : en cas d'échec OCR, renvoie des champs vides + ocr_ok=false ;
 * le résident complète alors le formulaire à la main.
 */
class JustificatifOcrService
{
    public function __construct(
        private OcrEngine $engine,
        private JustificatifParser $parser,
    ) {}

    /**
     * @return array{ocr_ok: bool, champs: array{montant: float|null, date: string|null, methode: string|null, reference: string|null}}
     */
    public function extraire(UploadedFile $file): array
    {
        $vide = ['montant' => null, 'date' => null, 'methode' => null, 'reference' => null];
        $tmp = [];

        try {
            $imagePath = $this->cheminImage($file, $tmp);
            $texte = $this->engine->text($imagePath);
            $champs = $this->parser->parse($texte);

            // OCR « réussi » si au moins un champ exploitable a été extrait.
            $ocrOk = $champs !== $vide;

            return ['ocr_ok' => $ocrOk, 'champs' => $champs];
        } catch (\Throwable $e) {
            Log::warning('OCR justificatif échoué', ['error' => $e->getMessage()]);

            return ['ocr_ok' => false, 'champs' => $vide];
        } finally {
            foreach ($tmp as $f) {
                @unlink($f);
            }
        }
    }

    /**
     * Retourne un chemin d'image lisible par l'OCR. Un PDF est rasterisé
     * (1re page) via pdftoppm. Les fichiers temporaires créés sont ajoutés à $tmp.
     *
     * @param  list<string>  $tmp
     */
    private function cheminImage(UploadedFile $file, array &$tmp): string
    {
        $estPdf = $file->getClientMimeType() === 'application/pdf'
            || strtolower((string) $file->getClientOriginalExtension()) === 'pdf';

        if (! $estPdf) {
            return $file->getRealPath();
        }

        $prefix = sys_get_temp_dir().'/ocr-'.bin2hex(random_bytes(6));
        $process = new Process([
            config('services.ocr.pdftoppm_bin', 'pdftoppm'),
            '-png', '-singlefile', '-r', '200', '-f', '1', '-l', '1',
            $file->getRealPath(), $prefix,
        ]);
        $process->setTimeout((int) config('services.ocr.timeout', 25));
        $process->mustRun();

        $png = $prefix.'.png';
        $tmp[] = $png;

        return $png;
    }
}
