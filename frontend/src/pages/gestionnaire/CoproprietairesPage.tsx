import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import {
  getResidences,
  getCoproprietaires,
  type Coproprietaire,
} from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CoproRow = Coproprietaire & { residence_name: string }

export function CoproprietairesPage() {
  const { t } = useTranslation()
  const [selectedResidenceId, setSelectedResidenceId] = useState<string>('')

  const { data: residences = [], isLoading: loadingResidences } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const residenceId = selectedResidenceId ? Number(selectedResidenceId) : null

  const { data: coproprietaires = [], isLoading: loadingCopro } = useQuery({
    queryKey: ['coproprietaires', residenceId],
    queryFn: () => getCoproprietaires(residenceId!),
    enabled: residenceId !== null,
  })

  const selectedResidence = residences.find((r) => r.id === residenceId)

  const rows: CoproRow[] = coproprietaires.map((c) => ({
    ...c,
    residence_name: selectedResidence?.name ?? '',
  }))

  const columns: Column<CoproRow>[] = [
    {
      key: 'name',
      header: t('gestionnaire.coproprietaires.colNom'),
      sortable: true,
    },
    {
      key: 'phone',
      header: t('gestionnaire.coproprietaires.colTelephone'),
    },
    {
      key: 'lot',
      header: t('gestionnaire.coproprietaires.colLot'),
      renderCell: (r) => (
        <span className="font-mono text-sm">{r.lot.numero}</span>
      ),
    },
    {
      key: 'solde_actuel',
      header: t('gestionnaire.coproprietaires.colSolde'),
      sortable: true,
      renderCell: (r) => (
        <MontantDisplay value={r.solde_actuel} colorize />
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title={t('gestionnaire.coproprietaires.title')}
        subtitle={t('gestionnaire.coproprietaires.subtitle')}
      />

      {/* Residence selector */}
      <div className="mb-6">
        <Select
          value={selectedResidenceId}
          onValueChange={setSelectedResidenceId}
          disabled={loadingResidences}
        >
          <SelectTrigger className="w-72">
            <SelectValue
              placeholder={t('gestionnaire.coproprietaires.selectResidence')}
            />
          </SelectTrigger>
          <SelectContent>
            {residences.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey="id"
        isLoading={residenceId !== null && loadingCopro}
        searchable
        exportable
        exportFilename="coproprietaires"
        emptyIcon={<Users className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.coproprietaires.empty')}
        emptyDescription={t('gestionnaire.coproprietaires.emptyDesc')}
      />
    </div>
  )
}
