import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileText, Inbox, Search, Users } from 'lucide-react'
import { EmptyState } from './EmptyState'

const meta = {
  title: 'Imaro/Shared/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'État vide pour tables et listes. Toujours afficher un message utile + CTA si possible.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: <Inbox className="size-12" />,
    title: 'Aucun élément',
    description: 'Les éléments apparaîtront ici une fois créés.',
  },
}

export const WithAction: Story = {
  args: {
    icon: <FileText className="size-12" />,
    title: 'Aucune quittance',
    description: 'Les quittances apparaîtront ici une fois générées.',
    actionLabel: 'Générer une quittance',
    onAction: () => alert('Generate clicked'),
  },
}

export const NoResults: Story = {
  args: {
    icon: <Search className="size-12" />,
    title: 'Aucun résultat',
    description: "Essayez d'élargir vos critères de recherche.",
  },
}

export const InvitationCTA: Story = {
  args: {
    icon: <Users className="size-12" />,
    title: 'Aucun copropriétaire',
    description:
      'Commencez par ajouter les copropriétaires de votre résidence.',
    actionLabel: 'Ajouter un copropriétaire',
    onAction: () => alert('Add clicked'),
  },
}
