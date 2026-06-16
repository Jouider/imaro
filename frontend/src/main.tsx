import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { hydrateToken } from '@/lib/tokenStore'
import { useAuthStore } from '@/stores/authStore'

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Restore the persisted auth token (secure store on native) into the auth store
// before the first render, so guarded routes and the first API calls have it.
void hydrateToken()
  .then((token) => {
    if (token) useAuthStore.setState({ token })
  })
  .finally(mount)
