import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from './ConfirmModal'

const meta = {
  title: 'Imaro/Shared/ConfirmModal',
  component: ConfirmModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modale de confirmation réutilisable. **Toujours** utiliser avant toute suppression irréversible.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmModal>

export default meta
type Story = StoryObj<typeof meta>

function Demo({
  title,
  description,
  variant,
  confirmLabel,
}: {
  title: string
  description: React.ReactNode
  variant?: 'destructive' | 'default'
  confirmLabel?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Ouvrir la modale</Button>
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        variant={variant}
        confirmLabel={confirmLabel}
        onConfirm={() => {
          alert('Confirmed')
          setOpen(false)
        }}
      />
    </>
  )
}

export const Destructive: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    title: '',
    description: '',
    onConfirm: () => {},
  },
  render: () => (
    <Demo
      title="Supprimer le lot ?"
      description={
        <>
          Le lot <strong>A-102</strong> sera définitivement supprimé. Cette
          action est irréversible.
        </>
      }
    />
  ),
}

export const NeutralAction: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    title: '',
    description: '',
    onConfirm: () => {},
  },
  render: () => (
    <Demo
      title="Clôturer l'exercice ?"
      description="Une fois clôturé, l'exercice ne pourra plus être modifié."
      variant="default"
      confirmLabel="Clôturer"
    />
  ),
}
