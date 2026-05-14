import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { PortailLoginPage } from '@/pages/portail/PortailLoginPage'
import { PortailDashboardPage } from '@/pages/portail/PortailDashboardPage'
import { PortailGuard } from './PortailGuard'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },

  // ── Portail copropriétaire ──────────────────────────────
  { path: '/portail/login', element: <PortailLoginPage /> },
  {
    path: '/portail',
    element: (
      <PortailGuard>
        <PortailDashboardPage />
      </PortailGuard>
    ),
  },
])
