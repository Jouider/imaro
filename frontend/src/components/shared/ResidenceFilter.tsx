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

export function ResidenceFilter() {
  const { t } = useTranslation()
  const residenceId = useResidenceStore((s) => s.residenceId)
  const setResidenceId = useResidenceStore((s) => s.setResidenceId)

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  return (
    <Select
      value={residenceId === null ? ALL : String(residenceId)}
      onValueChange={(v) => setResidenceId(v === ALL ? null : Number(v))}
    >
      <SelectTrigger
        className="h-8 w-[180px] gap-1.5 border-border/60 bg-background text-sm"
        aria-label={t('gestionnaire.residenceSwitcher.aria', {
          defaultValue: 'Filtrer par résidence',
        })}
      >
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue
          placeholder={t('gestionnaire.residenceSwitcher.all', {
            defaultValue: 'Toutes les résidences',
          })}
        />
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
  )
}
