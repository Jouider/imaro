// Limites & validation des médias d'annonce (KAN-96) — alignées sur le backend
// (issue #265) : images ≤ 5 Mo (jpeg/png/webp), vidéos ≤ 30 Mo (mp4/quicktime/webm).

export const MAX_MEDIA = 6

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024

export type MediaValidationError =
  | 'invalidType'
  | 'imageTooLarge'
  | 'videoTooLarge'

/** Returns `null` if the file is acceptable, otherwise an i18n error key. */
export function validateMediaFile(file: File): MediaValidationError | null {
  const isImage = IMAGE_TYPES.includes(file.type)
  const isVideo = VIDEO_TYPES.includes(file.type)
  if (!isImage && !isVideo) return 'invalidType'
  if (isImage && file.size > MAX_IMAGE_BYTES) return 'imageTooLarge'
  if (isVideo && file.size > MAX_VIDEO_BYTES) return 'videoTooLarge'
  return null
}

/** True when the file is a video (used for preview rendering). */
export function isVideoFile(file: File): boolean {
  return VIDEO_TYPES.includes(file.type)
}

/** `accept` attribute for the file input. */
export const MEDIA_ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(',')
