import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Building2, ArrowRight } from 'lucide-react'
import { getResidences, type Residence } from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'

export function ResidencesPage() {
  const { t } = useTranslation()

  const { data: residences = [], isLoading } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const columns: Column<Residence>[] = [
    {
      key: 'name',
      header: t('gestionnaire.residences.colNom'),
      sortable: true,
    },
    {
      key: 'address',
      header: t('gestionnaire.residences.colAdresse'),
    },
    {
      key: 'city',
      header: t('gestionnaire.residences.colVille'),
      sortable: true,
    },
    {
      key: 'nb_lots',
      header: t('gestionnaire.residences.colLots'),
      sortable: true,
      className: 'text-right',
      renderCell: (r) => <span className="tabular-nums">{r.nb_lots}</span>,
    },
    {
      key: 'taux_recouvrement',
      header: t('gestionnaire.residences.colRecouvrement'),
      sortable: true,
      renderCell: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--color-imaro-accent)]"
              style={{ width: `${Math.min(r.taux_recouvrement, 100)}%` }}
            />
          </div>
          <span className="tabular-nums text-sm">
            {r.taux_recouvrement.toFixed(0)} %
          </span>
        </div>
      ),
    },
    {
      key: 'id',
      header: '',
      renderCell: (r) => (
        <Button asChild variant="ghost" size="sm">
          <Link to={`/gestionnaire/residences/${r.id}`}>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ),
      className: 'w-12 text-right',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title={t('gestionnaire.residences.title')}
        subtitle={t('gestionnaire.residences.subtitle')}
      />

      <DataTable
        data={residences}
        columns={columns}
        rowKey="id"
        isLoading={isLoading}
        searchable
        searchPlaceholder={t('gestionnaire.residences.searchPlaceholder')}
        exportable
        exportFilename="residences"
        emptyIcon={<Building2 className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.residences.empty')}
        emptyDescription={t('gestionnaire.residences.emptyDesc')}
      />
    </div>
  )
}
