/**
 * Asset loader for the annexes PDF generators.
 * Loads the Imaro logo PNGs as base64 data URIs (one-shot, cached).
 *
 * Works in:
 *   - Browser (Vite): fetches /logo-*.png from the public folder
 *   - Node (test scripts): reads from disk via fs/path
 */

type LogoVariant = 'horizontal' | 'horizontal-inverted' | 'stacked'

const _cache: Partial<Record<LogoVariant, string>> = {}

const FILE_NAMES: Record<LogoVariant, string> = {
  'horizontal':          'logo-horizontal.png',
  // PDF-optimized: cropped + resized to 400×200 (~19 KB instead of 132 KB).
  // Keeps the navy/orange iconography readable on dark backgrounds.
  'horizontal-inverted': 'logo-horizontal-inverted-pdf.png',
  'stacked':             'logo-stacked.png',
}

async function loadInBrowser(variant: LogoVariant): Promise<string> {
  const res = await fetch(`/${FILE_NAMES[variant]}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

async function loadInNode(variant: LogoVariant): Promise<string> {
  const fs   = await import('fs')
  const pathMod = await import('path')
  const urlMod  = await import('url')
  const here = pathMod.dirname(urlMod.fileURLToPath(import.meta.url))
  // src/lib/<this file>  →  ../../public/<filename>
  const file = pathMod.join(here, '..', '..', 'public', FILE_NAMES[variant])
  const buf  = fs.readFileSync(file)
  return 'data:image/png;base64,' + buf.toString('base64')
}

export async function loadLogo(variant: LogoVariant): Promise<string> {
  if (_cache[variant]) return _cache[variant]!
  const isBrowser = typeof window !== 'undefined' && typeof fetch !== 'undefined'
  const dataUri = isBrowser ? await loadInBrowser(variant) : await loadInNode(variant)
  _cache[variant] = dataUri
  return dataUri
}
