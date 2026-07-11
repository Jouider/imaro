import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatutBadge } from './StatutBadge'

const meta = {
  title: 'Imaro/Shared/StatutBadge',
  component: StatutBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "Badge de statut financier — `payé` (vert), `impayé` (rouge), `partiel` (orange), `retard` (rouge). Le libellé vient d'i18n (`statut.*`).",
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    statut: {
      control: 'select',
      options: ['paye', 'impaye', 'partiel', 'retard'],
    },
  },
} satisfies Meta<typeof StatutBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Paye: Story = { args: { statut: 'paye' } }
export const Impaye: Story = { args: { statut: 'impaye' } }
export const Partiel: Story = { args: { statut: 'partiel' } }
export const Retard: Story = { args: { statut: 'retard' } }

export const All: Story = {
  args: { statut: 'paye' },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatutBadge statut="paye" />
      <StatutBadge statut="impaye" />
      <StatutBadge statut="partiel" />
      <StatutBadge statut="retard" />
    </div>
  ),
}
