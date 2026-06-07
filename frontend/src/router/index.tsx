import { createBrowserRouter, Navigate } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { PortailLayout } from '@/pages/portail/PortailLayout'
import { PortailHomePage } from '@/pages/portail/PortailHomePage'
import { PortailFinancesPage } from '@/pages/portail/PortailFinancesPage'
import { PortailReclamationsPage } from '@/pages/portail/PortailReclamationsPage'
import { PortailProfilPage } from '@/pages/portail/PortailProfilPage'
import { PortailActualitesPage } from '@/pages/portail/PortailActualitesPage'
import { PortailVisiteursPage } from '@/pages/portail/PortailVisiteursPage'
import { PortailGuard } from './PortailGuard'
import { GestionnaireGuard } from './GestionnaireGuard'
import { GestionnaireLayout } from '@/layouts/GestionnaireLayout'
import { OnboardingPage } from '@/pages/gestionnaire/OnboardingPage'
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
import { ImportsPage } from '@/pages/gestionnaire/ImportsPage'
import { AuditTrailPage } from '@/pages/gestionnaire/AuditTrailPage'
import { AnnexesPage } from '@/pages/gestionnaire/AnnexesPage'
import { ConformitePage } from '@/pages/gestionnaire/ConformitePage'
import { RecouvrementPage } from '@/pages/gestionnaire/RecouvrementPage'
import { AssistanceRecouvrementPage } from '@/pages/gestionnaire/AssistanceRecouvrementPage'
import { RappelsPage } from '@/pages/gestionnaire/RappelsPage'
import { VisitesPage } from '@/pages/gestionnaire/VisitesPage'
import { VisitorPassPage } from '@/pages/public/VisitorPassPage'
import { GardienPage } from '@/pages/gardien/GardienPage'
import { GardienGuard } from './GardienGuard'
import { PointagePage } from '@/pages/gestionnaire/PointagePage'
import { OccupantsPage } from '@/pages/gestionnaire/OccupantsPage'
import { EquipementsPage } from '@/pages/gestionnaire/EquipementsPage'
import { EmpruntsPage } from '@/pages/gestionnaire/EmpruntsPage'
import { TravauxExceptionnelsPage } from '@/pages/gestionnaire/TravauxExceptionnelsPage'
import { AutresRecettesPage } from '@/pages/gestionnaire/AutresRecettesPage'
import { RemboursementsPage } from '@/pages/gestionnaire/RemboursementsPage'
import { IaAssistantPage } from '@/pages/gestionnaire/IaAssistantPage'
import { UtilisateursPage } from '@/pages/gestionnaire/UtilisateursPage'
import { PersonnelPage } from '@/pages/gestionnaire/PersonnelPage'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // ── Public visitor pass (no auth, scanned at the lobby) ──
  { path: '/v/:token', element: <VisitorPassPage /> },

  // ── Gardien (lobby PWA — scan + walk-in) ──
  {
    path: '/gardien',
    element: (
      <GardienGuard>
        <GardienPage />
      </GardienGuard>
    ),
  },

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
      { path: 'visiteurs', element: <PortailVisiteursPage /> },
      { path: 'profil', element: <PortailProfilPage /> },
    ],
  },

  // ── Onboarding première connexion (plein écran, sans sidebar) ──
  {
    path: '/gestionnaire/onboarding',
    element: (
      <GestionnaireGuard>
        <OnboardingPage />
      </GestionnaireGuard>
    ),
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
      {
        path: 'appels-fonds',
        element: <Navigate to="/gestionnaire/paiements" replace />,
      },
      { path: 'paiements', element: <PaiementsPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'assemblees', element: <AssembleesPage /> },
      { path: 'annonces', element: <AnnoncesPage /> },
      { path: 'prestataires', element: <PrestatairesPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'comptabilite', element: <ComptabilitePage /> },
      { path: 'depenses', element: <DepensesPage /> },
      { path: 'imports', element: <ImportsPage /> },
      { path: 'recouvrement', element: <RecouvrementPage /> },
      {
        path: 'assistance-recouvrement',
        element: <AssistanceRecouvrementPage />,
      },
      { path: 'rappels', element: <RappelsPage /> },
      { path: 'visites', element: <VisitesPage /> },
      { path: 'pointage', element: <PointagePage /> },
      { path: 'occupants', element: <OccupantsPage /> },
      { path: 'equipements', element: <EquipementsPage /> },
      { path: 'emprunts', element: <EmpruntsPage /> },
      { path: 'travaux-exceptionnels', element: <TravauxExceptionnelsPage /> },
      { path: 'autres-recettes', element: <AutresRecettesPage /> },
      { path: 'remboursements', element: <RemboursementsPage /> },
      { path: 'ia', element: <IaAssistantPage /> },
      { path: 'conformite', element: <ConformitePage /> },
      { path: 'annexes', element: <AnnexesPage /> },
      { path: 'audit', element: <AuditTrailPage /> },
      { path: 'utilisateurs', element: <UtilisateursPage /> },
      { path: 'personnel', element: <PersonnelPage /> },
      { path: 'profil', element: <ProfilPage /> },
    ],
  },

  // ── Anciennes routes /manager → fusionnées dans /gestionnaire ──
  {
    path: '/manager',
    element: <Navigate to="/gestionnaire/dashboard" replace />,
  },
  {
    path: '/manager/gestionnaires',
    element: <Navigate to="/gestionnaire/utilisateurs" replace />,
  },
  {
    path: '/manager/residences',
    element: <Navigate to="/gestionnaire/residences" replace />,
  },
  {
    path: '/manager/dashboard',
    element: <Navigate to="/gestionnaire/dashboard" replace />,
  },
])
