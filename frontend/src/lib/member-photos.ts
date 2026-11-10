import demoProfilePhotoMap from './demo-profile-photo-map.json'

export const profilePhotoChoices = Array.from({ length: 8 }, (_, index) => ({
  url: `/images/people/portrait-${String(index + 1).padStart(2, '0')}.webp`,
  label: `Portrait ${index + 1}`,
}))

const profilePhotoPaths = new Set(profilePhotoChoices.map(photo => photo.url))

export const isProfilePhotoPath = (value: string) => profilePhotoPaths.has(value)

const demoPhotos = demoProfilePhotoMap as Record<string, string>

/** Portraits uniques et cohérents avec les prénoms pour les profils de démonstration. */
export function demoProfilePhoto(userId?: string) {
  if (!userId || !/^demo-user-\d+$/.test(userId)) return ''
  return demoPhotos[userId] || ''
}
