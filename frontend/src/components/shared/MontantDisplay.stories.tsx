import type { Meta, StoryObj } from '@storybook/react-vite'
import { MontantDisplay } from './MontantDisplay'

const meta = {
  title: 'Imaro/Shared/MontantDisplay',
  component: MontantDisplay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Formate un montant en dirhams marocains. Toujours `DH` (jamais MAD/€/$). Séparateur milliers narrow-space, virgule décimale.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    colorize: { control: 'boolean' },
  },
} satisfies Meta<typeof MontantDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { value: 1500 },
}

export const Large: Story = {
  args: { value: 125400.75 },
}

export const Zero: Story = {
  args: { value: 0 },
}

export const NegativeColorized: Story = {
  args: { value: -250.5, colorize: true },
  parameters: {
    docs: {
      description: {
        story:
          'Quand `colorize` est actif et la valeur est négative, le texte passe en rouge Imaro danger.',
      },
    },
  },
}

export const NegativeNotColorized: Story = {
  args: { value: -250.5 },
}

export const Grid: Story = {
  args: { value: 0 },
  render: () => (
    <div className="grid grid-cols-2 gap-3 text-right">
      <span className="text-muted-foreground">Petite somme</span>
      <MontantDisplay value={42} />
      <span className="text-muted-foreground">Mensuel</span>
      <MontantDisplay value={1500} />
      <span className="text-muted-foreground">Annuel</span>
      <MontantDisplay value={18000} />
      <span className="text-muted-foreground">Budget total</span>
      <MontantDisplay value={1254300.75} />
      <span className="text-muted-foreground">Solde négatif</span>
      <MontantDisplay value={-1250.5} colorize />
    </div>
  ),
}
