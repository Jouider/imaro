import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createReclamation } from '@/services/portail.service'

const CATEGORIES = [
  'Parties communes',
  'Ascenseur',
  'Eau/Plomberie',
  'Électricité',
  'Sécurité',
  'Autre',
]

const MAX_IMAGES = 5
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

type FormState = {
  categorie: string
  sujet: string
  description: string
}

const EMPTY_FORM: FormState = { categorie: '', sujet: '', description: '' }

export function PortailReclamationsPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: createReclamation,
    onSuccess: () => {
      toast.success(t('portail.reclamations.success'))
      setForm(EMPTY_FORM)
      setErrors({})
      previews.forEach((url) => URL.revokeObjectURL(url))
      setImages([])
      setPreviews([])
    },
    onError: () => {
      toast.error(t('actions.loading'))
    },
  })

  function validate(): boolean {
    const next: Partial<FormState> = {}
    if (!form.categorie) next.categorie = t('portail.reclamations.categorie')
    if (form.sujet.trim().length < 5)
      next.sujet = t('portail.reclamations.sujet')
    if (!form.description.trim())
      next.description = t('portail.reclamations.description')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      categorie: form.categorie,
      sujet: form.sujet.trim(),
      description: form.description.trim(),
      images,
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    // Validate size
    const oversized = files.find((f) => f.size > MAX_SIZE_BYTES)
    if (oversized) {
      toast.error(t('portail.reclamations.photoSizeError'))
      return
    }

    // Take only what fits under the cap
    const slots = MAX_IMAGES - images.length
    const toAdd = files.slice(0, slots)
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f))

    setImages((prev) => [...prev, ...toAdd])
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  function handleRemoveImage(index: number) {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-[var(--color-imaro-primary)]">
        {t('portail.reclamations.title')}
      </h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Catégorie */}
        <div className="space-y-1.5">
          <Label htmlFor="categorie" className="text-base">
            {t('portail.reclamations.categorie')}
          </Label>
          <Select
            value={form.categorie}
            onValueChange={(val) => setForm((f) => ({ ...f, categorie: val }))}
          >
            <SelectTrigger
              id="categorie"
              className="w-full h-12 text-base"
              data-invalid={!!errors.categorie}
            >
              <SelectValue placeholder={t('portail.reclamations.categorie')} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categorie && (
            <p className="text-xs text-destructive">{errors.categorie}</p>
          )}
        </div>

        {/* Sujet */}
        <div className="space-y-1.5">
          <Label htmlFor="sujet" className="text-base">
            {t('portail.reclamations.sujet')}
          </Label>
          <Input
            id="sujet"
            value={form.sujet}
            onChange={(e) => setForm((f) => ({ ...f, sujet: e.target.value }))}
            className="h-12 text-base"
            minLength={5}
            required
          />
          {errors.sujet && (
            <p className="text-xs text-destructive">{errors.sujet}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-base">
            {t('portail.reclamations.description')}
          </Label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            required
            className="flex min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none dark:bg-input/30"
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description}</p>
          )}
        </div>

        {/* Images upload — max 5 · jpeg/png/webp · 5 MB each */}
        <div className="space-y-2">
          {/* Hidden file input — multiple allowed */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Thumbnails row + add button */}
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative shrink-0">
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="h-20 w-20 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  aria-label={t('portail.reclamations.removePhoto')}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}

            {/* Show add button only when under the cap */}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-xs text-muted-foreground transition-colors hover:border-[var(--color-imaro-primary)] hover:text-[var(--color-imaro-primary)]"
              >
                <Camera className="size-5" aria-hidden="true" />
                {images.length === 0
                  ? t('portail.reclamations.addPhoto')
                  : `+${MAX_IMAGES - images.length}`}
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t('portail.reclamations.photoHint')}
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 text-base bg-[var(--color-imaro-accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? t('actions.loading')
            : t('portail.reclamations.submit')}
        </Button>
      </form>

      {/* Hint card */}
      <div className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t('portail.reclamations.hint')}
      </div>
    </div>
  )
}
