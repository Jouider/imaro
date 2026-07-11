import { api, type ApiEnvelope } from '@/lib/axios'

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** Média attaché à une annonce (KAN-96). `url` est servie par le backend. */
export type AnnonceMedia = {
  type: 'image' | 'video'
  url: string
  taille_ko: number
}

export type Annonce = {
  id: number
  titre: string
  contenu: string
  statut: 'brouillon' | 'publiee' | 'archivee'
  priorite: 'normale' | 'urgente'
  residence: { id: number; name: string } | null
  date_publication: string | null
  created_at: string
  nb_lectures: number
  media?: AnnonceMedia[]
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_ANNONCES: Annonce[] = [
  {
    id: 1,
    titre: 'Travaux ascenseur — interruption de service',
    contenu:
      "L'ascenseur sera hors service du 20 au 22 mai 2026 pour maintenance préventive annuelle. Merci de votre compréhension.",
    statut: 'publiee',
    priorite: 'urgente',
    residence: { id: 1, name: 'Atlas Casablanca' },
    date_publication: '2026-05-10',
    created_at: '2026-05-09T14:00:00Z',
    nb_lectures: 18,
  },
  {
    id: 2,
    titre: 'Assemblée générale ordinaire — convocation',
    contenu:
      "L'assemblée générale ordinaire se tiendra le samedi 31 mai 2026 à 10h00 dans la salle commune du rez-de-chaussée. Ordre du jour : approbation des comptes 2025, budget prévisionnel 2026.",
    statut: 'publiee',
    priorite: 'normale',
    residence: null,
    date_publication: '2026-05-08',
    created_at: '2026-05-08T09:00:00Z',
    nb_lectures: 42,
  },
  {
    id: 3,
    titre: 'Planning nettoyage parties communes — mai 2026',
    contenu:
      'Le nettoyage renforcé des couloirs et halls aura lieu chaque mercredi matin à partir du 15 mai 2026.',
    statut: 'publiee',
    priorite: 'normale',
    residence: { id: 2, name: 'Blanca Rabat' },
    date_publication: '2026-05-05',
    created_at: '2026-05-05T11:30:00Z',
    nb_lectures: 11,
  },
  {
    id: 4,
    titre: 'Révision tarifaire 2027 — consultation',
    contenu:
      'Nous préparons le budget 2027. Vos suggestions concernant les charges communes sont les bienvenues avant le 15 juin.',
    statut: 'brouillon',
    priorite: 'normale',
    residence: null,
    date_publication: null,
    created_at: '2026-05-14T16:00:00Z',
    nb_lectures: 0,
  },
  {
    id: 5,
    titre: 'Règles de stationnement — rappel',
    contenu:
      'Rappel : les places de parking visiteurs sont limitées à 2h. Merci de respecter ce délai pour permettre à tous les résidents de profiter de cet espace.',
    statut: 'archivee',
    priorite: 'normale',
    residence: { id: 3, name: 'Marina Agadir' },
    date_publication: '2026-04-01',
    created_at: '2026-04-01T08:00:00Z',
    nb_lectures: 29,
  },
]

// ─── Service functions ────────────────────────────────────────────────────────

export async function getAnnonces(params?: {
  statut?: string
  residence_id?: number
}): Promise<Annonce[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ annonces: Annonce[] }>>(
        '/gestionnaire/annonces',
        { params },
      )
      return res.data.data.annonces
    },
    params?.statut
      ? MOCK_ANNONCES.filter((a) => a.statut === params.statut)
      : MOCK_ANNONCES,
  )
}

export async function storeAnnonce(
  data: {
    titre: string
    contenu: string
    priorite: string
    residence_id?: number
    /** Fichiers image/vidéo à uploader (max 6) — envoyés en multipart `media[]`. */
    media?: File[]
  },
  opts?: { onProgress?: (pct: number) => void },
): Promise<Annonce> {
  return withMock(
    async () => {
      const hasMedia = !!data.media?.length
      const body = hasMedia ? buildAnnonceFormData(data) : data
      const res = await api.post<ApiEnvelope<{ annonce: Annonce }>>(
        '/gestionnaire/annonces',
        body,
        hasMedia
          ? {
              onUploadProgress: (e) => {
                if (opts?.onProgress && e.total)
                  opts.onProgress(Math.round((e.loaded / e.total) * 100))
              },
            }
          : undefined,
      )
      return res.data.data.annonce
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      titre: data.titre,
      contenu: data.contenu,
      statut: 'brouillon' as const,
      priorite: data.priorite as 'normale' | 'urgente',
      residence: null,
      date_publication: null,
      created_at: new Date().toISOString(),
      nb_lectures: 0,
      media: [],
    },
  )
}

/** Builds the multipart payload for create/update with `media[]` files. */
function buildAnnonceFormData(data: {
  titre: string
  contenu: string
  priorite: string
  residence_id?: number
  media?: File[]
  supprimer_media?: string[]
}): FormData {
  const fd = new FormData()
  fd.append('titre', data.titre)
  fd.append('contenu', data.contenu)
  fd.append('priorite', data.priorite)
  if (data.residence_id != null)
    fd.append('residence_id', String(data.residence_id))
  data.media?.forEach((file) => fd.append('media[]', file))
  data.supprimer_media?.forEach((path) => fd.append('supprimer_media[]', path))
  return fd
}

export async function updateAnnonce(
  id: number,
  data: Partial<Pick<Annonce, 'titre' | 'contenu' | 'priorite'>>,
): Promise<Annonce> {
  const res = await api.put<ApiEnvelope<{ annonce: Annonce }>>(
    `/gestionnaire/annonces/${id}`,
    data,
  )
  return res.data.data.annonce
}

export async function publishAnnonce(id: number): Promise<Annonce> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ annonce: Annonce }>>(
        `/gestionnaire/annonces/${id}/publier`,
      )
      return res.data.data.annonce
    },
    {
      ...(MOCK_ANNONCES.find((a) => a.id === id) ?? MOCK_ANNONCES[0]),
      statut: 'publiee' as const,
      date_publication: new Date().toISOString().slice(0, 10),
    },
  )
}

export async function archiveAnnonce(id: number): Promise<Annonce> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ annonce: Annonce }>>(
        `/gestionnaire/annonces/${id}/archiver`,
      )
      return res.data.data.annonce
    },
    {
      ...(MOCK_ANNONCES.find((a) => a.id === id) ?? MOCK_ANNONCES[0]),
      statut: 'archivee' as const,
    },
  )
}

export async function deleteAnnonce(id: number): Promise<void> {
  await withMock(async () => {
    await api.delete(`/gestionnaire/annonces/${id}`)
  }, undefined)
}
