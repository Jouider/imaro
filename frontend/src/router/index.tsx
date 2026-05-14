import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { PortailLoginPage } from '@/pages/portail/PortailLoginPage'
import { PortailLayout } from '@/pages/portail/PortailLayout'
import { PortailHomePage } from '@/pages/portail/PortailHomePage'
import { PortailFinancesPage } from '@/pages/portail/PortailFinancesPage'
import { PortailReclamationsPage } from '@/pages/portail/PortailReclamationsPage'
import { PortailProfilPage } from '@/pages/portail/PortailProfilPage'
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
        <PortailLayout />
      </PortailGuard>
    ),
    children: [
      { index: true, element: <PortailHomePage /> },
      { path: 'finances', element: <PortailFinancesPage /> },
      { path: 'reclamations', element: <PortailReclamationsPage /> },
      { path: 'profil', element: <PortailProfilPage /> },
    ],
  },
])
