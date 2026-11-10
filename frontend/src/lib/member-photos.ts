export const profilePhotoChoices = Array.from({ length: 8 }, (_, index) => ({
  url: `/images/people/portrait-${String(index + 1).padStart(2, '0')}.webp`,
  label: `Portrait ${index + 1}`,
}))

const profilePhotoPaths = new Set(profilePhotoChoices.map(photo => photo.url))

export const isProfilePhotoPath = (value: string) => profilePhotoPaths.has(value)

/** Portraits de démonstration uniquement : les vrais membres gardent leurs initiales s'ils n'ont pas choisi de photo. */
export function demoProfilePhoto(userId?: string) {
  const match = userId?.match(/^demo-user-(\d+)$/)
  if (!match) return ''
  const portrait = ((Number(match[1]) - 1) % profilePhotoChoices.length) + 1
  return `/images/people/portrait-${String(portrait).padStart(2, '0')}.webp`
}
