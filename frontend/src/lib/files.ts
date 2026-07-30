import { env } from '@/lib/env'

/**
 * Origine du backend (sans le suffixe `/api`) — sert de base aux fichiers servis
 * sur le disque public Laravel (`/storage/...`). Dérivée de `VITE_API_URL`.
 */
function backendOrigin(): string {
  try {
    const url = new URL(env.apiBase)
    return url.origin
  } catch {
    // apiBase relatif (ex. tests) → même origine que le front.
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
}

/**
 * Résout l'URL d'un justificatif renvoyé par l'API.
 *
 * Le backend renvoie déjà `Storage::url($path)` dans le champ `justificatif_path` :
 * soit une URL absolue (`https://host/storage/...` quand `APP_URL` est configuré),
 * soit une URL racine-relative (`/storage/...`). Dans les deux cas il ne faut
 * **jamais** re-préfixer par `/storage/` (bug historique KAN-124/125 : double
 * préfixe → 404). Cette fonction :
 *
 * - renvoie `null` pour une valeur vide,
 * - laisse une URL absolue inchangée,
 * - préfixe une URL racine-relative (`/storage/...`) par l'origine du backend,
 * - traite un chemin brut (`depenses/xx.pdf`) comme `/{origin}/storage/{path}`.
 */
export function resolveStorageUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null

  // Déjà absolue → telle quelle.
  if (/^https?:\/\//i.test(value)) return value

  const origin = backendOrigin()

  // Racine-relative (`/storage/...` renvoyé par Storage::url sans APP_URL absolu).
  if (value.startsWith('/')) return `${origin}${value}`

  // Chemin brut relatif au disque public.
  return `${origin}/storage/${value.replace(/^\/+/, '')}`
}
