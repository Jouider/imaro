import { Navigate, Route, Routes } from 'react-router-dom'
import { getToken } from './lib/api'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { Facturation } from './pages/Facturation'
import { Users } from './pages/Users'
import { Audit } from './pages/Audit'
import { Broadcast } from './pages/Broadcast'
import { FeatureFlags } from './pages/FeatureFlags'
import { Systeme } from './pages/Systeme'
import { Plans } from './pages/Plans'
import { Leads } from './pages/Leads'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/facturation" element={<Facturation />} />
        <Route path="/utilisateurs" element={<Users />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/diffusion" element={<Broadcast />} />
        <Route path="/fonctionnalites" element={<FeatureFlags />} />
        <Route path="/systeme" element={<Systeme />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/leads" element={<Leads />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
