import { activeOffer, canJoinDirectly, offerDeadline, queueNeedsRefresh, waitlistOf, type Activity } from './activity'

/**
 * Liste d'attente (sujet ART) : transitions pures, appliquées dans une transaction
 * Firestore (services/activities.ts) et vérifiées par les règles (docs/firestore.rules).
 * Chaque fonction renvoie les champs à modifier, ou null s'il n'y a rien à faire.
 */
export type QueuePatch = Partial<Pick<Activity, 'participantIds' | 'waitlistIds' | 'offer'>> | null
export class OfferExpiredError extends Error { constructor() { super('Le délai pour confirmer cette place est dépassé.') } }
export class PlacesLeftError extends Error { constructor() { super('Il reste des places : inscris-toi directement.') } }

/** Une place libre est proposée au premier de la file, qui a 24 h (au plus tard le début de l'activité) pour confirmer. */
export function nextOffer(a: Activity, participantIds: string[], now = Date.now()): QueuePatch {
  const waitlist = waitlistOf(a)
  if (participantIds.length >= a.capacity || !waitlist.length) return { offer: null, waitlistIds: waitlist }
  const [first, ...rest] = waitlist
  return { offer: { uid: first as string, expiresAtMs: offerDeadline(a, now), offeredAtMs: now }, waitlistIds: rest }
}

export function leave(a: Activity, uid: string, now = Date.now()): QueuePatch {
  if (!a.participantIds.includes(uid)) return null
  const participantIds = a.participantIds.filter(p => p !== uid)
  // Une offre est déjà en cours : la place libérée suivante sera proposée après sa réponse.
  return activeOffer(a, now) ? { participantIds } : { participantIds, ...nextOffer(a, participantIds, now) }
}
export function wait(a: Activity, uid: string, now = Date.now()): QueuePatch {
  if (a.participantIds.includes(uid) || waitlistOf(a).includes(uid) || a.offer?.uid === uid) return null
  if (canJoinDirectly(a, now)) throw new PlacesLeftError()
  return { waitlistIds: [...waitlistOf(a), uid] }
}
export function stopWaiting(a: Activity, uid: string): QueuePatch {
  return waitlistOf(a).includes(uid) ? { waitlistIds: waitlistOf(a).filter(w => w !== uid) } : null
}
export function accept(a: Activity, uid: string, now = Date.now()): QueuePatch {
  if (a.participantIds.includes(uid)) return null
  if (activeOffer(a, now)?.uid !== uid) throw new OfferExpiredError()
  const participantIds = [...a.participantIds, uid]
  return { participantIds, ...nextOffer(a, participantIds, now) }
}
export function decline(a: Activity, uid: string, now = Date.now()): QueuePatch {
  return a.offer?.uid === uid ? nextOffer(a, a.participantIds, now) : null
}
export function refresh(a: Activity, now = Date.now()): QueuePatch {
  return queueNeedsRefresh(a, now) ? nextOffer(a, a.participantIds, now) : null
}
