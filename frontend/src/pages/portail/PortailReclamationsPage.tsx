import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import {
  Camera,
  X,
  FileText,
  Clock,
  Building2,
  ArrowUpDown,
  Droplet,
  Zap,
  Thermometer,
  ShieldCheck,
  Sparkles,
  Volume2,
  Trees,
  Car,
  Phone,
  Droplets,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createReclamation,
  getMyReclamations,
  rateReclamation,
  type Reclamation,
  type ReclamationRating,
} from '@/services/portail.service'
import { cn } from '@/lib/utils'

type Tab = 'submit' | 'history'

/**
 * Reclamation categories (KAN-55). The `key` is stable and i18n-translated in
 * the dropdown; `fr` is the canonical label stored on submit so the data stays
 * human-readable in the gestionnaire's ticket list regardless of UI language.
 * `autre` reveals a free-text field for a custom type.
 */
const CATEGORIES: { key: string; fr: string }[] = [
  { key: 'parties_communes', fr: 'Parties communes' },
  { key: 'ascenseur', fr: 'Ascenseur' },
  { key: 'plomberie', fr: 'Eau / Plomberie' },
  { key: 'electricite', fr: 'Électricité' },
  { key: 'chauffage', fr: 'Chauffage / Climatisation' },
  { key: 'securite', fr: 'Sécurité' },
  { key: 'proprete', fr: 'Propreté / Nettoyage' },
  { key: 'nuisances', fr: 'Nuisances sonores' },
  { key: 'espaces_verts', fr: 'Espaces verts' },
  { key: 'parking', fr: 'Parking / Garage' },
  { key: 'interphone', fr: 'Interphone / Accès' },
  { key: 'degat_eaux', fr: 'Dégât des eaux' },
  { key: 'autre', fr: 'Autre' },
]

/** Icône par catégorie (KAN-55) — repère visuel à gauche de chaque option. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  parties_communes: Building2,
  ascenseur: ArrowUpDown,
  plomberie: Droplet,
  electricite: Zap,
  chauffage: Thermometer,
  securite: ShieldCheck,
  proprete: Sparkles,
  nuisances: Volume2,
  espaces_verts: Trees,
  parking: Car,
  interphone: Phone,
  degat_eaux: Droplets,
  autre: Tag,
}

const MAX_IMAGES = 5
const MAX_SIZE_BYTES = 5 * 1024 * 1024

const STATUT_STYLES: Record<string, string> = {
  ouvert: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-orange-100 text-orange-700',
  resolu: 'bg-green-100 text-green-800',
  clos: 'bg-gray-100 text-gray-600',
}

const STATUT_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  clos: 'Clôturé',
}

type FormState = {
  categorie: string
  customCategorie: string
  sujet: string
  description: string
}

const EMPTY_FORM: FormState = {
  categorie: '',
  customCategorie: '',
  sujet: '',
  description: '',
}

export function PortailReclamationsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('submit')

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-[var(--color-imaro-primary)]">
        {t('portail.reclamations.title')}
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <TabBtn
          active={activeTab === 'submit'}
          onClick={() => setActiveTab('submit')}
        >
          Signaler
        </TabBtn>
        <TabBtn
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          {t('portail.reclamations.title')}
        </TabBtn>
      </div>

      {activeTab === 'submit' ? <SubmitForm t={t} qc={qc} /> : <HistoryTab />}
    </div>
  )
}

// ─── TabBtn ───────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-b-2 border-[var(--color-imaro-accent)] text-[var(--color-imaro-accent)]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

// ─── SubmitForm ───────────────────────────────────────────────────────────────

function SubmitForm({
  t,
  qc,
}: {
  t: (key: string) => string
  qc: ReturnType<typeof useQueryClient>
}) {
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
      void qc.invalidateQueries({ queryKey: ['portail-reclamations'] })
    },
    onError: (err) => {
      let msg: string | undefined
      if (isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string; errors?: Record<string, string[]> }
          | undefined
        msg = data?.message ?? Object.values(data?.errors ?? {})[0]?.[0]
      }
      toast.error(msg ?? t('portail.reclamations.sendError'))
    },
  })

  function validate(): boolean {
    const next: Partial<FormState> = {}
    if (!form.categorie) next.categorie = t('portail.reclamations.categorie')
    if (form.categorie === 'autre' && !form.customCategorie.trim())
      next.customCategorie = t('portail.reclamations.customRequired')
    if (form.sujet.trim().length < 5)
      next.sujet = t('portail.reclamations.sujetMin')
    if (!form.description.trim())
      next.description = t('portail.reclamations.description')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    // The backend validates `categorie` against the enum
    // (plomberie|electricite|ascenseur|proprete|securite|autre), so we must
    // send the key — not the localized label. The free-text custom type
    // (only for "autre") has no dedicated field, so we fold it into the
    // description to preserve it (KAN-55).
    const customType =
      form.categorie === 'autre' && form.customCategorie.trim()
        ? form.customCategorie.trim()
        : null
    const description = customType
      ? `${customType}\n\n${form.description.trim()}`
      : form.description.trim()
    mutation.mutate({
      categorie: form.categorie,
      sujet: form.sujet.trim(),
      description,
      images,
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    const oversized = files.find((f) => f.size > MAX_SIZE_BYTES)
    if (oversized) {
      toast.error(t('portail.reclamations.photoSizeError'))
      return
    }
    const slots = MAX_IMAGES - images.length
    const toAdd = files.slice(0, slots)
    setImages((prev) => [...prev, ...toAdd])
    setPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ])
  }

  function handleRemoveImage(index: number) {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2" noValidate>
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
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.key] ?? Tag
              return (
                <SelectItem key={cat.key} value={cat.key}>
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className="size-4 shrink-0 text-[var(--color-imaro-primary)]"
                      aria-hidden="true"
                    />
                    {t(`portail.reclamations.categories.${cat.key}`)}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {errors.categorie && (
          <p className="text-xs text-destructive">{errors.categorie}</p>
        )}
      </div>

      {/* Custom type when "Autre" is picked (KAN-55) */}
      {form.categorie === 'autre' && (
        <div className="space-y-1.5">
          <Label htmlFor="custom-categorie" className="text-base">
            {t('portail.reclamations.customLabel')}
          </Label>
          <Input
            id="custom-categorie"
            value={form.customCategorie}
            onChange={(e) =>
              setForm((f) => ({ ...f, customCategorie: e.target.value }))
            }
            placeholder={t('portail.reclamations.customPlaceholder')}
            className="h-12 text-base"
            data-invalid={!!errors.customCategorie}
            maxLength={60}
          />
          {errors.customCategorie && (
            <p className="text-xs text-destructive">{errors.customCategorie}</p>
          )}
        </div>
      )}

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
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
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

      <Button
        type="submit"
        className="w-full h-12 text-base bg-[var(--color-imaro-accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]"
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? t('actions.loading')
          : t('portail.reclamations.submit')}
      </Button>

      <div className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t('portail.reclamations.hint')}
      </div>
    </form>
  )
}

// ─── HistoryTab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const { t } = useTranslation()
  const { data: reclamations, isLoading } = useQuery({
    queryKey: ['portail-reclamations'],
    queryFn: getMyReclamations,
  })

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (!reclamations || reclamations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <FileText className="size-12 text-muted-foreground" />
        <p className="font-medium text-sm">{t('portail.reclamations.empty')}</p>
        <p className="text-xs text-muted-foreground">
          {t('portail.reclamations.emptyHint')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-2">
      {reclamations.map((r) => (
        <ReclamationCard key={r.id} rec={r} />
      ))}
    </div>
  )
}

// ─── ReclamationCard ──────────────────────────────────────────────────────────

function ReclamationCard({ rec }: { rec: Reclamation }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [localRating, setLocalRating] = useState<ReclamationRating | undefined>(
    rec.rating,
  )
  const [showChange, setShowChange] = useState(false)

  const rateMut = useMutation({
    mutationFn: (rating: ReclamationRating) => rateReclamation(rec.id, rating),
    onSuccess: (_data, rating) => {
      setLocalRating(rating)
      setShowChange(false)
      void qc.invalidateQueries({ queryKey: ['portail-reclamations'] })
    },
    onError: () => toast.error(t('actions.error')),
  })

  const cls = STATUT_STYLES[rec.statut] ?? 'bg-gray-100 text-gray-600'
  const dateStr = new Date(rec.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const isResolved = rec.statut === 'resolu' || rec.statut === 'clos'
  const showRatingUI = isResolved

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug truncate">
            {rec.sujet}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rec.reference} · {rec.categorie}
          </p>
        </div>
        <Badge className={cn(cls, 'border-0 shrink-0 text-xs')}>
          {STATUT_LABELS[rec.statut] ?? rec.statut}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {dateStr}
        </span>
        {rec.nb_photos > 0 && (
          <span>
            {rec.nb_photos} photo{rec.nb_photos > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-1.5 pt-1">
        {(['ouvert', 'en_cours', 'resolu'] as const).map((s, i) => {
          const steps = ['ouvert', 'en_cours', 'resolu', 'clos']
          const currentIdx = steps.indexOf(rec.statut)
          const done = i <= currentIdx
          return (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                done ? 'bg-[var(--color-imaro-accent)]' : 'bg-muted',
              )}
            />
          )
        })}
      </div>

      {/* Satisfaction rating — shown on resolu/clos tickets (KAN-90) */}
      {showRatingUI && (
        <div className="pt-2 border-t">
          {localRating && !showChange ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="text-base leading-none">
                  {localRating === 'satisfait' ? '😀' : '😞'}
                </span>
                {t('portail.reclamations.ratingThanks')}
              </span>
              <button
                type="button"
                onClick={() => setShowChange(true)}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {t('portail.reclamations.ratingChange')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('portail.reclamations.ratingPrompt')}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={rateMut.isPending}
                  onClick={() => rateMut.mutate('satisfait')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                    'hover:bg-green-50 hover:border-green-400 hover:text-green-700',
                    rateMut.isPending && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className="text-xl leading-none">😀</span>
                  {t('portail.reclamations.ratingSatisfait')}
                </button>
                <button
                  type="button"
                  disabled={rateMut.isPending}
                  onClick={() => rateMut.mutate('insatisfait')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                    'hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700',
                    rateMut.isPending && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className="text-xl leading-none">😞</span>
                  {t('portail.reclamations.ratingInsatisfait')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
