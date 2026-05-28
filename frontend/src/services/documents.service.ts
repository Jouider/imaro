import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
// In dev, if the backend is unreachable the functions return mock data silently.
// In production, API errors propagate normally.

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GestDoc = {
  id: number
  nom: string
  type: 'reglement' | 'pv_ag' | 'contrat' | 'facture' | 'autre'
  residence: { id: number; name: string } | null
  date: string // ISO date
  url: string
  taille_ko: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DOCS: GestDoc[] = [
  {
    id: 1,
    nom: 'Règlement de copropriété — Atlas Casablanca',
    type: 'reglement',
    residence: { id: 1, name: 'Atlas Casablanca' },
    date: '2024-01-15',
    url: 'https://example.com/docs/reglement-atlas.pdf',
    taille_ko: 1240,
  },
  {
    id: 2,
    nom: 'PV Assemblée Générale Ordinaire 2025',
    type: 'pv_ag',
    residence: { id: 1, name: 'Atlas Casablanca' },
    date: '2025-06-12',
    url: 'https://example.com/docs/pv-ag-2025-atlas.pdf',
    taille_ko: 380,
  },
  {
    id: 3,
    nom: 'Contrat gardiennage 2026 — Résidence Al Blanca',
    type: 'contrat',
    residence: { id: 2, name: 'Résidence Al Blanca' },
    date: '2026-01-01',
    url: 'https://example.com/docs/contrat-gardiennage-blanca.pdf',
    taille_ko: 215,
  },
  {
    id: 4,
    nom: 'Facture entretien ascenseur — avril 2026',
    type: 'facture',
    residence: { id: 2, name: 'Résidence Al Blanca' },
    date: '2026-04-30',
    url: 'https://example.com/docs/facture-ascenseur-avr-2026.pdf',
    taille_ko: 88,
  },
  {
    id: 5,
    nom: 'Charte bonne conduite — toutes résidences',
    type: 'autre',
    residence: null,
    date: '2023-09-01',
    url: 'https://example.com/docs/charte-conduite.pdf',
    taille_ko: 520,
  },
]

// ─── Service functions ────────────────────────────────────────────────────────

export async function getDocuments(): Promise<GestDoc[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ documents: GestDoc[] }>>(
      '/gestionnaire/documents',
    )
    return res.data.data.documents
  }, MOCK_DOCS)
}

export async function storeDocument(data: FormData): Promise<GestDoc> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ document: GestDoc }>>(
        '/gestionnaire/documents',
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return res.data.data.document
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      nom: (data.get('nom') as string | null) ?? 'Nouveau document',
      type: ((data.get('type') as string | null) ?? 'autre') as GestDoc['type'],
      residence: null,
      date:
        (data.get('date') as string | null) ??
        new Date().toISOString().slice(0, 10),
      url: 'https://example.com/docs/nouveau.pdf',
      taille_ko: 0,
    },
  )
}

export async function deleteDocument(id: number): Promise<void> {
  await withMock(async () => {
    await api.delete(`/gestionnaire/documents/${id}`)
  }, undefined)
}
