import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingSkeleton } from './LoadingSkeleton'

const meta = {
  title: 'Imaro/Shared/LoadingSkeleton',
  component: LoadingSkeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Squelette de chargement réutilisable. À utiliser sur tout `isLoading` — jamais de spinner nu.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['card', 'table', 'kpi', 'text'],
    },
    count: { control: { type: 'number', min: 1, max: 10 } },
  },
} satisfies Meta<typeof LoadingSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Card: Story = {
  args: { variant: 'card', count: 3 },
}

export const Kpi: Story = {
  args: { variant: 'kpi', count: 4 },
}

export const Table: Story = {
  args: { variant: 'table', count: 5 },
}

export const Text: Story = {
  args: { variant: 'text', count: 3 },
}
