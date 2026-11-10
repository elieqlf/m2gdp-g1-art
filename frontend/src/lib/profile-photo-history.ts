const maxHistorySize = 4

function storageKey(uid: string) {
  return `novart_profile_photos_${encodeURIComponent(uid)}`
}

export function getProfilePhotoHistory(uid: string, currentPhoto = '') {
  if (typeof localStorage === 'undefined') return currentPhoto ? [currentPhoto] : []
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(uid)) || '[]')
    const history = Array.isArray(saved) ? saved.filter((photo): photo is string => typeof photo === 'string' && photo.length <= 300_000) : []
    return [...new Set([currentPhoto, ...history].filter(Boolean))].slice(0, maxHistorySize)
  } catch { return currentPhoto ? [currentPhoto] : [] }
}

export function rememberProfilePhoto(uid: string | undefined, photo: string, history: string[] = []) {
  if (!uid || !photo || typeof localStorage === 'undefined') return history
  const next = [...new Set([photo, ...history, ...getProfilePhotoHistory(uid)].filter(Boolean))].slice(0, maxHistorySize)
  try { localStorage.setItem(storageKey(uid), JSON.stringify(next)) } catch { /* Quota ou stockage indisponible : la photo courante reste enregistrable. */ }
  return next
}
