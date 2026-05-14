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
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: createReclamation,
    onSuccess: () => {
      toast.success(t('portail.reclamations.success'))
      setForm(EMPTY_FORM)
      setErrors({})
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
      setPhoto(null)
      setPhotoPreview(null)
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
      photo,
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    // Reset input value so the same file can be re-selected after removal
    e.target.value = ''
  }

  function handleRemovePhoto() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhoto(null)
    setPhotoPreview(null)
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

        {/* Photo upload */}
        <div className="space-y-1.5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {photo && photoPreview ? (
            /* Thumbnail with remove button */
            <div className="relative inline-block">
              <img
                src={photoPreview}
                alt={t('portail.reclamations.removePhoto')}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                aria-label={t('portail.reclamations.removePhoto')}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            /* Add photo trigger button */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-[var(--color-imaro-primary)] hover:text-[var(--color-imaro-primary)]"
            >
              <Camera className="size-5 shrink-0" aria-hidden="true" />
              {t('portail.reclamations.addPhoto')}
            </button>
          )}

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
