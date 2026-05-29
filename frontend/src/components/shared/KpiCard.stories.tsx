import type { Meta, StoryObj } from '@storybook/react-vite'
import { Building2, CreditCard, Users, Wallet } from 'lucide-react'
import { KpiCard } from './KpiCard'

const meta = {
  title: 'Imaro/Shared/KpiCard',
  component: KpiCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Carte KPI : icône + valeur déjà formatée + libellé + variation optionnelle. La valeur est `string | number` — pré-formater les montants avec la locale fr-FR (`1 500,00 DH`).',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof KpiCard>

export default meta
type Story = StoryObj<typeof meta>

const fmt = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dh = (n: number) => `${fmt.format(n)} DH`

export const Default: Story = {
  args: {
    icon: <Building2 className="size-5" />,
    value: '12',
    label: 'Copropriétés actives',
  },
}

export const WithMontant: Story = {
  args: {
    icon: <Wallet className="size-5" />,
    value: dh(125400),
    label: 'Trésorerie',
  },
}

export const WithPositiveTrend: Story = {
  args: {
    icon: <CreditCard className="size-5" />,
    value: dh(48200),
    label: 'Encaissements du mois',
    trend: { value: 12.5, label: 'vs mois dernier' },
  },
}

export const WithNegativeTrend: Story = {
  args: {
    icon: <Users className="size-5" />,
    value: '24',
    label: 'Impayés',
    trend: { value: -8.2, label: 'vs mois dernier' },
  },
}

export const Grid: Story = {
  args: {
    icon: <Building2 className="size-5" />,
    value: '0',
    label: '',
  },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={<Building2 className="size-5" />}
        value="12"
        label="Copropriétés"
      />
      <KpiCard
        icon={<Users className="size-5" />}
        value="284"
        label="Copropriétaires"
        trend={{ value: 3.2, label: 'ce trimestre' }}
      />
      <KpiCard
        icon={<Wallet className="size-5" />}
        value={dh(125400)}
        label="Trésorerie"
        trend={{ value: 12.5, label: 'vs mois dernier' }}
      />
      <KpiCard
        icon={<CreditCard className="size-5" />}
        value={dh(18250)}
        label="Impayés"
        trend={{ value: -5.1, label: 'vs mois dernier' }}
      />
    </div>
  ),
}
