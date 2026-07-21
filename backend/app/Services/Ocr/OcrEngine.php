<?php

namespace App\Services\Ocr;

/**
 * Moteur OCR offline. Implémentation par défaut : Tesseract (CLI).
 * Abstrait pour pouvoir basculer plus tard (PaddleOCR, etc.) sans toucher
 * aux appelants.
 */
interface OcrEngine
{
    /**
     * Extrait le texte brut d'une image (chemin local) — jamais d'appel réseau.
     */
    public function text(string $imagePath): string;
}
