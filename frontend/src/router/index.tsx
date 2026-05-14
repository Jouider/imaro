import { createBrowserRouter, Navigate } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { PortailLoginPage } from '@/pages/portail/PortailLoginPage'
import { PortailLayout } from '@/pages/portail/PortailLayout'
import { PortailHomePage } from '@/pages/portail/PortailHomePage'
import { PortailFinancesPage } from '@/pages/portail/PortailFinancesPage'
import { PortailReclamationsPage } from '@/pages/portail/PortailReclamationsPage'
import { PortailProfilPage } from '@/pages/portail/PortailProfilPage'
import { PortailGuard } from './PortailGuard'
import { GestionnaireGuard } from './GestionnaireGuard'
import { GestionnaireLayout } from '@/layouts/GestionnaireLayout'
import { DashboardPage as GestDashboardPage } from '@/pages/gestionnaire/DashboardPage'

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

  // ── Espace gestionnaire / manager ───────────────────────
  {
    path: '/gestionnaire',
    element: (
      <GestionnaireGuard>
        <GestionnaireLayout />
      </GestionnaireGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/gestionnaire/dashboard" replace />,
      },
      { path: 'dashboard', element: <GestDashboardPage /> },
    ],
  },
])
