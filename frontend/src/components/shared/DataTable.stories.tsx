import type { Meta, StoryObj } from '@storybook/react-vite'
import { Users } from 'lucide-react'
import { DataTable, type Column } from './DataTable'
import { MontantDisplay } from './MontantDisplay'
import { StatutBadge, type Statut } from './StatutBadge'

type Coproprietaire = {
  id: number
  name: string
  lot: string
  phone: string
  solde: number
  statut: Statut
}

const ROWS: Coproprietaire[] = [
  {
    id: 1,
    name: 'Hassan Alaoui',
    lot: 'A-101',
    phone: '+212 6 12 34 56 78',
    solde: 0,
    statut: 'paye',
  },
  {
    id: 2,
    name: 'Salma Bennani',
    lot: 'A-102',
    phone: '+212 6 23 45 67 89',
    solde: -1250,
    statut: 'impaye',
  },
  {
    id: 3,
    name: 'Karim El Fassi',
    lot: 'A-201',
    phone: '+212 6 34 56 78 90',
    solde: -300,
    statut: 'partiel',
  },
  {
    id: 4,
    name: 'Nadia Tazi',
    lot: 'A-202',
    phone: '+212 6 45 67 89 01',
    solde: 0,
    statut: 'paye',
  },
  {
    id: 5,
    name: 'Omar Chraibi',
    lot: 'B-101',
    phone: '+212 6 56 78 90 12',
    solde: -2400,
    statut: 'retard',
  },
  {
    id: 6,
    name: 'Yasmine Idrissi',
    lot: 'B-102',
    phone: '+212 6 67 89 01 23',
    solde: 0,
    statut: 'paye',
  },
  {
    id: 7,
    name: 'Mehdi Saadi',
    lot: 'B-201',
    phone: '+212 6 78 90 12 34',
    solde: -800,
    statut: 'partiel',
  },
  {
    id: 8,
    name: 'Lina Berrada',
    lot: 'B-202',
    phone: '+212 6 89 01 23 45',
    solde: 0,
    statut: 'paye',
  },
  {
    id: 9,
    name: 'Youssef Lahlou',
    lot: 'C-101',
    phone: '+212 6 90 12 34 56',
    solde: -3200,
    statut: 'retard',
  },
  {
    id: 10,
    name: 'Sara Amrani',
    lot: 'C-102',
    phone: '+212 6 01 23 45 67',
    solde: 0,
    statut: 'paye',
  },
  {
    id: 11,
    name: 'Reda Benkirane',
    lot: 'C-201',
    phone: '+212 6 12 34 56 79',
    solde: -150,
    statut: 'partiel',
  },
  {
    id: 12,
    name: 'Imane Filali',
    lot: 'C-202',
    phone: '+212 6 23 45 67 80',
    solde: 0,
    statut: 'paye',
  },
]

const COLUMNS: Column<Coproprietaire>[] = [
  { key: 'name', header: 'Nom', sortable: true },
  { key: 'lot', header: 'Lot', sortable: true },
  { key: 'phone', header: 'Téléphone' },
  {
    key: 'solde',
    header: 'Solde',
    sortable: true,
    renderCell: (r) => <MontantDisplay value={r.solde} colorize />,
  },
  {
    key: 'statut',
    header: 'Statut',
    renderCell: (r) => <StatutBadge statut={r.statut} />,
  },
]

const meta = {
  title: 'Imaro/Shared/DataTable',
  component: DataTable<Coproprietaire>,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Table de données universelle : tri (col `sortable`), recherche globale, pagination, sélection multiple, export CSV.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable<Coproprietaire>>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    data: ROWS.slice(0, 5),
    columns: COLUMNS,
    rowKey: 'id',
  },
}

export const Searchable: Story = {
  args: {
    data: ROWS,
    columns: COLUMNS,
    rowKey: 'id',
    searchable: true,
    searchPlaceholder: 'Rechercher un copropriétaire…',
  },
}

export const SearchableExportablePaginated: Story = {
  args: {
    data: ROWS,
    columns: COLUMNS,
    rowKey: 'id',
    searchable: true,
    exportable: true,
    exportFilename: 'coproprietaires',
    pageSize: 5,
  },
}

export const Selectable: Story = {
  args: {
    data: ROWS.slice(0, 6),
    columns: COLUMNS,
    rowKey: 'id',
    selectable: true,
    onSelectionChange: (ids) => console.log('selected', ids),
  },
}

export const Loading: Story = {
  args: {
    data: [],
    columns: COLUMNS,
    rowKey: 'id',
    isLoading: true,
    pageSize: 5,
  },
}

export const Empty: Story = {
  args: {
    data: [],
    columns: COLUMNS,
    rowKey: 'id',
    emptyIcon: <Users className="size-12" />,
    emptyTitle: 'Aucun copropriétaire',
    emptyDescription: 'Commencez par importer ou créer un copropriétaire.',
    emptyActionLabel: 'Importer un fichier',
    onEmptyAction: () => alert('Import clicked'),
  },
}
