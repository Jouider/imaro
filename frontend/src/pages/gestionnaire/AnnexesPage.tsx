import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FileText, Download, RefreshCw, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getResidences } from '@/services/gestionnaire.service'
import { getAnnexes, regenerateAnnexe } from '@/services/conformite.service'

const ANNEXE_LABELS: Record<string, string> = {
  '10':   'Annexe 10 — État des Contributions des Copropriétaires',
  '13-1': 'Annexe 13-1 — État de la situation financière (Bilan)',
  '13-2': 'Annexe 13-2 — Compte de gestion général',
  '3':    'Annexe 3 — Informations générales',
  '4':    'Annexe 4 — Composition du fonds de copropriété',
  '5':    'Annexe 5 — Budget prévisionnel',
  '6':    'Annexe 6 — Engagements',
  '7':    'Annexe 7 — Mouvements de trésorerie',
  '8':    'Annexe 8 — État des liquidités',
  '9':    'Annexe 9 — Équipements / Immobilisations',
}

export function AnnexesPage() {
  const { t } = useTranslation()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(null)
  const [exercice, setExercice] = useState(2026)

  const residencesQ = useQuery({ queryKey: ['residences'], queryFn: getResidences })

  // Derive effective residence id (picked or auto first)
  const residenceId = pickedResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const annexesQ = useQuery({
    queryKey: ['annexes', residenceId, exercice],
    queryFn: () => getAnnexes(residenceId!, exercice),
    enabled: !!residenceId,
  })

  const regenMut = useMutation({
    mutationFn: (annexeNum: string) =>
      regenerateAnnexe(residenceId!, annexeNum, exercice),
    onSuccess: () => annexesQ.refetch(),
  })

  const annexes = annexesQ.data?.annexes ?? []
  const regime = annexesQ.data?.regime ?? 'simplifie'
  const required = annexes.filter((a) => a.required)
  const optional = annexes.filter((a) => !a.required)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#1B4F72]/10">
          <FileText className="size-5 text-[#1B4F72]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.annexes.title', { defaultValue: 'Annexes Comptables' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.annexes.subtitle', {
              defaultValue: 'Annexes réglementaires selon le Décret 2.23.700',
            })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Résidence</label>
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setPickedResidenceId(Number(v))}
        >
          <SelectTrigger className="w-64"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="text-sm font-medium">Exercice</label>
        <Select value={String(exercice)} onValueChange={(v) => setExercice(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge
          variant="outline"
          className={cn(
            'ml-auto text-xs font-medium',
            regime === 'simplifie'
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-blue-300 bg-blue-50 text-blue-700',
          )}
        >
          {regime === 'simplifie'
            ? 'Régime simplifié (≤ 200 000 MAD/an)'
            : 'Régime normal'}
        </Badge>
      </div>

      {/* Required annexes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Annexes obligatoires
        </h2>
        <div className="space-y-2">
          {required.map((a) => (
            <AnnexeCard
              key={a.num}
              num={a.num}
              label={ANNEXE_LABELS[a.num] ?? `Annexe ${a.num}`}
              available={a.available}
              lastGenerated={a.last_generated}
              required
              onRegenerate={() => regenMut.mutate(a.num)}
              loading={regenMut.isPending && regenMut.variables === a.num}
            />
          ))}
        </div>
      </section>

      {/* Optional annexes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Annexes complémentaires
        </h2>
        <div className="space-y-2">
          {optional.map((a) => (
            <AnnexeCard
              key={a.num}
              num={a.num}
              label={ANNEXE_LABELS[a.num] ?? `Annexe ${a.num}`}
              available={a.available}
              lastGenerated={a.last_generated}
              onRegenerate={() => regenMut.mutate(a.num)}
              loading={regenMut.isPending && regenMut.variables === a.num}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function AnnexeCard({
  label, available, lastGenerated, required, onRegenerate, loading,
}: {
  num: string
  label: string
  available: boolean
  lastGenerated?: string
  required?: boolean
  onRegenerate: () => void
  loading: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-4 rounded-xl border bg-card p-4',
      required && 'border-[#1B4F72]/30',
    )}>
      <div className={cn(
        'flex size-10 items-center justify-center rounded-lg',
        required ? 'bg-[#1B4F72]/10 text-[#1B4F72]' : 'bg-muted text-muted-foreground',
      )}>
        {available ? <Check className="size-5" /> : <Lock className="size-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          {required && (
            <Badge variant="outline" className="border-[#1B4F72]/40 bg-[#1B4F72]/5 text-[10px] text-[#1B4F72]">
              Requis
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {available
            ? lastGenerated
              ? `Dernière génération : ${new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(lastGenerated))}`
              : 'Jamais générée'
            : 'Calcul en attente — données insuffisantes'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!available || loading}
          onClick={onRegenerate}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Régénérer
        </Button>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          disabled={!available}
        >
          <Download className="size-3.5" />
          PDF
        </Button>
      </div>
    </div>
  )
}
