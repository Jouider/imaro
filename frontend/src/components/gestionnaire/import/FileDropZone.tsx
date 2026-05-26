import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileSpreadsheet, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  onFileSelected: (file: File) => void
  onDownloadTemplate: () => void
  accept?: string
  loading?: boolean
}

const ACCEPTED = '.xlsx,.csv,.xls'

export function FileDropZone({
  onFileSelected,
  onDownloadTemplate,
  accept = ACCEPTED,
  loading,
}: Props) {
  const { t } = useTranslation()
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setSelectedFile(file)
      onFileSelected(file)
    },
    [onFileSelected],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer',
          dragOver
            ? 'border-[#1B4F72] bg-[#1B4F72]/5 scale-[1.01]'
            : 'border-muted-foreground/25 hover:border-[#1B4F72]/50 hover:bg-muted/30',
          loading && 'pointer-events-none opacity-50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          aria-label="Sélectionner un fichier"
        />

        {selectedFile ? (
          <>
            <FileSpreadsheet className="size-10 text-green-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {selectedFile.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearFile()
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Retirer le fichier"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(0)} Ko
            </span>
          </>
        ) : (
          <>
            <Upload className="size-10 text-muted-foreground/40" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {t('gestionnaire.imports.upload.dropzone')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('gestionnaire.imports.upload.or')}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/60">
              {t('gestionnaire.imports.upload.accepted')}
            </p>
          </>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
            <div className="size-6 animate-spin rounded-full border-2 border-[#1B4F72] border-t-transparent" />
          </div>
        )}
      </div>

      {/* Template download */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDownloadTemplate()
          }}
          className="gap-2 text-xs"
        >
          <Download className="size-3.5" />
          {t('gestionnaire.imports.upload.downloadTemplate')}
        </Button>
      </div>
    </div>
  )
}
