import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FileText, Download, RefreshCw, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getResidences,
  getCoproprietaires,
  getImpayes,
  type Coproprietaire,
  type Impaye,
} from '@/services/gestionnaire.service'
import {
  getAnnexes,
  regenerateAnnexe,
  getAnnexeData,
} from '@/services/conformite.service'
import {
  generateAnnexe10Pdf,
  generateAnnexe131Pdf,
  generateAnnexe132Pdf,
  generateAnnexePdf,
  type Annexe10Row,
} from '@/lib/annexes-pdf'

const ANNEXE_LABELS: Record<string, string> = {
  '3': 'Annexe 3 — Bilan (État de la situation financière)',
  '4': 'Annexe 4 — Compte de gestion général',
  '5': 'Annexe 5 — Suivi du budget prévisionnel',
  '6': 'Annexe 6 — Travaux et opérations non courantes',
  '7': 'Annexe 7 — Mouvements de trésorerie',
  '8': 'Annexe 8 — Suivi des emprunts',
  '9': 'Annexe 9 — Suivi des équipements',
  '10': 'Annexe 10 — État des contributions des copropriétaires',
  '11': 'Annexe 11 — État simplifié de la situation financière',
  '12': 'Annexe 12 — Compte de résultat simplifié',
  '13-1': 'Annexe 13-1 — État de la situation financière (très simplifié)',
  '13-2': 'Annexe 13-2 — Compte des produits et charges et budget',
}

export function AnnexesPage() {
  const { t } = useTranslation()

  const [pickedResidenceId, setPickedResidenceId] = useState<number | null>(
    null,
  )
  const [exercice, setExercice] = useState(2026)

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

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

  // Real data sources — populate the Annexe 10 table from existing services.
  // 13-1 / 13-2 stay at zero until backend exposes per-account aggregates
  // (see docs/sprint-4-conformite-legale.md).
  const copropQ = useQuery({
    queryKey: ['coproprietaires', residenceId],
    queryFn: () => getCoproprietaires(residenceId!),
    enabled: !!residenceId,
  })

  const impayesQ = useQuery({
    queryKey: ['impayes', residenceId],
    queryFn: () => getImpayes({ residence_id: residenceId! }),
    enabled: !!residenceId,
  })

  const residence = residencesQ.data?.find((r) => r.id === residenceId)
  const residenceName = residence?.name ?? 'Résidence'

  const commonCtx = {
    residenceName,
    exerciceLabel: `Exercice clos le 31 décembre ${exercice}`,
    exercice,
    generatedAtIso: new Date().toISOString(),
  }

  /** Aggregate impayés per coproprietaire to compute appelé/payé. */
  function buildAnnexe10Rows(): {
    rows: Annexe10Row[]
    totals: {
      soldeInitial: number
      appele: number
      paye: number
      soldeFinal: number
    }
  } {
    const coprops: Coproprietaire[] = copropQ.data ?? []
    const impayes: Impaye[] = impayesQ.data ?? []

    const impayesByCopro = new Map<number, { appele: number; paye: number }>()
    impayes.forEach((imp) => {
      const cur = impayesByCopro.get(imp.coproprietaire.id) ?? {
        appele: 0,
        paye: 0,
      }
      cur.appele += imp.montant_du
      cur.paye += imp.montant_paye
      impayesByCopro.set(imp.coproprietaire.id, cur)
    })

    const rows: Annexe10Row[] = coprops
      .filter((c) => c.lot)
      .map((c) => {
        const agg = impayesByCopro.get(c.id) ?? { appele: 0, paye: 0 }
        return {
          lotNumero: c.lot?.numero ?? '—',
          coproprietaireNom: c.name,
          soldeInitial: 0, // requires bilan d'ouverture endpoint
          appele: agg.appele,
          paye: agg.paye,
          soldeFinal: c.solde,
        }
      })

    const totals = rows.reduce(
      (acc, r) => ({
        soldeInitial: acc.soldeInitial + r.soldeInitial,
        appele: acc.appele + r.appele,
        paye: acc.paye + r.paye,
        soldeFinal: acc.soldeFinal + r.soldeFinal,
      }),
      { soldeInitial: 0, appele: 0, paye: 0, soldeFinal: 0 },
    )

    return { rows, totals }
  }

  // Backend payload shapes (match Abdellah's API responses for annexes 10/13-1/13-2).
  // Source : docs/sprint-4-conformite-legale.md §9.2 + his PR #63.
  type Annexe10Payload = {
    totals: {
      soldeInitial: number
      appele: number
      paye: number
      soldeFinal: number
    }
    rows: Annexe10Row[]
  }
  type Annexe131Payload = {
    current: {
      fondsReserve: number
      creances: number
      dettes: number
      tresorerie: number
    }
    previous: {
      fondsReserve: number
      creances: number
      dettes: number
      tresorerie: number
    }
  }
  type Quad4 = { n1: number; n: number; n0: number; nMinus1: number }
  type Annexe132Payload = {
    excedent: number
    recettes: {
      cotisations: Quad4
      fondsReserve: Quad4
      autresAg: Quad4
      autresProduits: Quad4
    }
    depenses: {
      matieres: Quad4
      servicesExterieurs: Quad4
      impotsTaxes: Quad4
      personnel: Quad4
      autresCharges: Quad4
    }
  }

  const handleDownload = async (annexeNum: string) => {
    if (!residenceId) return
    try {
      // For the 3 required annexes, fetch real data from Abdellah's backend.
      // Fall back to client-aggregates / zero defaults on error.
      if (annexeNum === '10') {
        let data: { totals: Annexe10Payload['totals']; rows: Annexe10Row[] }
        try {
          const payload = await getAnnexeData<Annexe10Payload>(
            residenceId,
            '10',
            exercice,
          )
          data = { totals: payload.totals, rows: payload.rows }
        } catch {
          // backend unavailable → use client-computed data
          data = buildAnnexe10Rows()
        }
        await generateAnnexe10Pdf({ ...commonCtx, ...data })
      } else if (annexeNum === '13-1') {
        let payload: Annexe131Payload
        try {
          payload = await getAnnexeData<Annexe131Payload>(
            residenceId,
            '13-1',
            exercice,
          )
        } catch {
          const zero = {
            fondsReserve: 0,
            creances: 0,
            dettes: 0,
            tresorerie: 0,
          }
          payload = { current: zero, previous: zero }
        }
        await generateAnnexe131Pdf({ ...commonCtx, ...payload })
      } else if (annexeNum === '13-2') {
        let payload: Annexe132Payload
        try {
          payload = await getAnnexeData<Annexe132Payload>(
            residenceId,
            '13-2',
            exercice,
          )
        } catch {
          const z: Quad4 = { n1: 0, n: 0, n0: 0, nMinus1: 0 }
          payload = {
            excedent: 0,
            recettes: {
              cotisations: z,
              fondsReserve: z,
              autresAg: z,
              autresProduits: z,
            },
            depenses: {
              matieres: z,
              servicesExterieurs: z,
              impotsTaxes: z,
              personnel: z,
              autresCharges: z,
            },
          }
        }
        await generateAnnexe132Pdf({ ...commonCtx, ...payload })
      } else {
        // Annexes 3, 4, 5, 6, 7, 8, 9, 11, 12 — backend not ready yet
        await generateAnnexePdf(annexeNum, commonCtx)
      }
      toast.success(`Annexe ${annexeNum} téléchargée`)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Impossible de générer l'annexe ${annexeNum}`,
      )
    }
  }

  const annexes = annexesQ.data?.annexes ?? []
  const regime = annexesQ.data?.regime ?? 'simplifie'
  const required = annexes.filter((a) => a.required)
  const optional = annexes.filter((a) => !a.required)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-imaro-primary)]/10">
          <FileText className="size-5 text-[var(--color-imaro-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.annexes.title', {
              defaultValue: 'Annexes Comptables',
            })}
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
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="text-sm font-medium">Exercice</label>
        <Select
          value={String(exercice)}
          onValueChange={(v) => setExercice(Number(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
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
              onDownload={() => handleDownload(a.num)}
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
              onDownload={() => handleDownload(a.num)}
              loading={regenMut.isPending && regenMut.variables === a.num}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function AnnexeCard({
  label,
  available,
  lastGenerated,
  required,
  onRegenerate,
  onDownload,
  loading,
}: {
  num: string
  label: string
  available: boolean
  lastGenerated?: string
  required?: boolean
  onRegenerate: () => void
  onDownload: () => void
  loading: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border bg-card p-4',
        required && 'border-[var(--color-imaro-primary)]/30',
      )}
    >
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-lg',
          required
            ? 'bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {available ? <Check className="size-5" /> : <Lock className="size-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          {required && (
            <Badge
              variant="outline"
              className="border-[var(--color-imaro-primary)]/40 bg-[var(--color-imaro-primary)]/5 text-[10px] text-[var(--color-imaro-primary)]"
            >
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
          onClick={onDownload}
        >
          <Download className="size-3.5" />
          PDF
        </Button>
      </div>
    </div>
  )
}
