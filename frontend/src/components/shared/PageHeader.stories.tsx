import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from './PageHeader'

const meta = {
  title: 'Imaro/Shared/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'En-tête de page standard : breadcrumb optionnel + titre H1 navy + sous-titre + slot actions.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const TitleOnly: Story = {
  args: { title: 'Tableau de bord' },
}

export const WithSubtitle: Story = {
  args: {
    title: 'Résidence Blanca',
    subtitle: '48 lots · 3 bâtiments · Casablanca',
  },
}

export const WithBreadcrumbs: Story = {
  args: {
    breadcrumbs: [
      { label: 'Copropriétés', href: '/residences' },
      { label: 'Résidence Blanca' },
    ],
    title: 'Résidence Blanca',
    subtitle: '48 lots · 3 bâtiments',
  },
}

export const WithActions: Story = {
  args: {
    breadcrumbs: [{ label: 'Copropriétaires' }],
    title: 'Copropriétaires',
    subtitle: '284 actifs',
    actions: (
      <>
        <Button variant="outline">Exporter</Button>
        <Button className="bg-[var(--accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]">
          <Plus className="me-1.5 size-4" />
          Nouveau
        </Button>
      </>
    ),
  },
}
