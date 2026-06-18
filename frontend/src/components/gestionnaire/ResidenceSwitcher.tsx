import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getResidences } from '@/services/gestionnaire.service'
import { useResidenceStore } from '@/stores/residenceStore'

const ALL = '_all'

/**
 * Global residence scope selector (KAN-47) — lives in the sidebar header.
 * Setting it filters data across every gestionnaire section via
 * {@link useResidenceStore}. `_all` = all residences.
 */
export function ResidenceSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { t } = useTranslation()
  const residenceId = useResidenceStore((s) => s.residenceId)
  const setResidenceId = useResidenceStore((s) => s.setResidenceId)

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  return (
    <div className="px-3 pb-3">
      <span className="mb-1.5 block px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 select-none">
        {t('common.residence')}
      </span>
      <Select
        value={residenceId === null ? ALL : String(residenceId)}
        onValueChange={(v) => {
          setResidenceId(v === ALL ? null : Number(v))
          onSelect?.()
        }}
      >
        <SelectTrigger
          aria-label={t('gestionnaire.residenceSwitcher.aria', {
            defaultValue: 'Filtrer par résidence',
          })}
          className="w-full gap-2 border-white/10 bg-white/10 text-white hover:bg-white/15 focus:ring-white/20 data-[placeholder]:text-white/60 [&>svg]:text-white/50"
        >
          <Building2 className="size-4 shrink-0 text-white/60" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t('gestionnaire.residenceSwitcher.all', {
              defaultValue: 'Toutes les résidences',
            })}
          </SelectItem>
          {residences.map((r) => (
            <SelectItem key={r.id} value={String(r.id)}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
