import type { Preview } from '@storybook/react-vite'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'
import '../src/i18n'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },

    backgrounds: {
      default: 'imaro-surface',
      values: [
        { name: 'imaro-surface', value: '#f8f9fa' },
        { name: 'white', value: '#ffffff' },
        { name: 'imaro-navy', value: '#1B4F72' },
      ],
    },
  },
  decorators: [
    (Story) =>
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          'div',
          { className: 'p-6 bg-background text-foreground font-sans' },
          React.createElement(Story),
        ),
      ),
  ],
}

export default preview
