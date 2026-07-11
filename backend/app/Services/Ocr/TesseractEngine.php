<?php

namespace App\Services\Ocr;

use RuntimeException;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

/**
 * Moteur OCR Tesseract (CLI), 100% offline.
 * `tesseract <image> stdout -l fra+ara+eng`.
 */
class TesseractEngine implements OcrEngine
{
    public function __construct(
        private string $bin = 'tesseract',
        private string $langs = 'fra+ara+eng',
        private int $timeout = 25,
    ) {}

    public function text(string $imagePath): string
    {
        $process = new Process([$this->bin, $imagePath, 'stdout', '-l', $this->langs]);
        $process->setTimeout($this->timeout);

        try {
            $process->run();
        } catch (\Throwable $e) {
            throw new RuntimeException('OCR Tesseract indisponible : '.$e->getMessage(), previous: $e);
        }

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        return $process->getOutput();
    }
}
