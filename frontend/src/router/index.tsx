import { createBrowserRouter, Navigate } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { PortailLayout } from '@/pages/portail/PortailLayout'
import { PortailHomePage } from '@/pages/portail/PortailHomePage'
import { PortailFinancesPage } from '@/pages/portail/PortailFinancesPage'
import { PortailReclamationsPage } from '@/pages/portail/PortailReclamationsPage'
import { PortailProfilPage } from '@/pages/portail/PortailProfilPage'
import { PortailActualitesPage } from '@/pages/portail/PortailActualitesPage'
import { PortailGuard } from './PortailGuard'
import { GestionnaireGuard } from './GestionnaireGuard'
import { GestionnaireLayout } from '@/layouts/GestionnaireLayout'
import { DashboardPage as GestDashboardPage } from '@/pages/gestionnaire/DashboardPage'
import { ResidencesPage } from '@/pages/gestionnaire/residences/ResidencesPage'
import { ResidencePage } from '@/pages/gestionnaire/residences/ResidencePage'
import { CoproprietairesPage } from '@/pages/gestionnaire/CoproprietairesPage'
import { PaiementsPage } from '@/pages/gestionnaire/PaiementsPage'
import { TicketsPage } from '@/pages/gestionnaire/TicketsPage'
import { AssembleesPage } from '@/pages/gestionnaire/AssembleesPage'
import { AnnoncesPage } from '@/pages/gestionnaire/AnnoncesPage'
import { PrestatairesPage } from '@/pages/gestionnaire/PrestatairesPage'
import { BudgetsPage } from '@/pages/gestionnaire/BudgetsPage'
import { DocumentsPage } from '@/pages/gestionnaire/DocumentsPage'
import { ComptabilitePage } from '@/pages/gestionnaire/ComptabilitePage'
import { DepensesPage } from '@/pages/gestionnaire/DepensesPage'
import { ProfilPage } from '@/pages/gestionnaire/ProfilPage'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },

  // ── Portail copropriétaire ──────────────────────────────
  // /portail/login now redirects to the unified /login page
  { path: '/portail/login', element: <Navigate to="/login" replace /> },
  {
    path: '/portail',
    element: (
      <PortailGuard>
        <PortailLayout />
      </PortailGuard>
    ),
    children: [
      { index: true, element: <PortailHomePage /> },
      { path: 'actualites', element: <PortailActualitesPage /> },
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
      { path: 'residences', element: <ResidencesPage /> },
      { path: 'residences/:id', element: <ResidencePage /> },
      { path: 'coproprietaires', element: <CoproprietairesPage /> },
      { path: 'appels-fonds', element: <Navigate to="/gestionnaire/paiements" replace /> },
      { path: 'paiements', element: <PaiementsPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'assemblees', element: <AssembleesPage /> },
      { path: 'annonces', element: <AnnoncesPage /> },
      { path: 'prestataires', element: <PrestatairesPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'comptabilite', element: <ComptabilitePage /> },
      { path: 'depenses', element: <DepensesPage /> },
      { path: 'profil', element: <ProfilPage /> },
    ],
  },
])
