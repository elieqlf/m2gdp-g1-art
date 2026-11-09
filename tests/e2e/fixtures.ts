import { expect, type Page, type TestInfo } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

// Les services Firebase, Places et météo sont remplacés uniquement dans le
// navigateur de test : aucun e-mail réel, aucune écriture Firestore, aucun appel facturable.
// Les données viennent du même générateur que le jeu de démonstration, recalculé à la date du jour.
export type Mode = 'request' | 'profile' | 'app'
export const ME = { uid: 'preview-user', email: 'preview@example.com' }

interface DemoUser { uid: string; firstName: string; lastName: string }
interface DemoActivity { id: string; participantIds: string[]; organizerId: string; date: string; title: string; capacity: number; waitlistIds?: string[]; offer?: { uid: string; expiresAtMs: number; offeredAtMs?: number } | null }
interface DemoMessage { activityId: string }

export function demoData() {
  const output = execFileSync(process.execPath, [resolve(__dirname, '../../scripts/seed/generate-data.mjs'), '--stdout'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  const data = JSON.parse(output) as { users: DemoUser[]; activities: DemoActivity[]; messages: DemoMessage[] }
  const activities = data.activities.slice(0, 90)
  const upcoming = activities.filter(a => a.date >= new Date().toISOString().slice(0, 10))
  // L'utilisateur de test participe à deux activités à venir et en organise une.
  upcoming[1]?.participantIds.splice(0, 1, ME.uid)
  upcoming[4]?.participantIds.splice(0, 1, ME.uid)
  if (upcoming[6]) Object.assign(upcoming[6], { organizerId: ME.uid, organizerName: 'Camille Martin' })
  // Liste d'attente : une place libérée attend sa confirmation, et il est n°2 dans une autre file.
  // Échéance fixe dans la journée (demain 19 h) : les rechargements de page gardent la même offre.
  const offerEnd = new Date().setHours(19, 0, 0, 0) + 24 * 3600 * 1000
  const full = upcoming.slice(8).filter(a => a.participantIds.length === a.capacity && a.organizerId !== ME.uid && a.date > new Date().toISOString().slice(0, 10))
  if (full[0]) Object.assign(full[0], { participantIds: full[0].participantIds.slice(1), offer: { uid: ME.uid, expiresAtMs: offerEnd, offeredAtMs: Date.now() - 2 * 3600 * 1000 } })
  if (full[1]) full[1].waitlistIds = [full[1].waitlistIds?.[0] ?? 'demo-user-001', ME.uid]
  const ids = new Set(activities.map(a => a.id))
  return { users: data.users, activities, messages: data.messages.filter(m => ids.has(m.activityId)) }
}

const firebaseModule = (mode: Mode, users: DemoUser[]) => `
const mode = ${JSON.stringify(mode)};
const me = ${JSON.stringify(ME)};
let observer;
let profile = mode === 'app'
  ? { firstName: 'Camille', lastName: 'Martin', userType: 'participant', address: 'Croix-Rousse, Lyon 4e', addressLat: 45.7768, addressLng: 4.8312, photoUrl: '', profileComplete: true, bio: 'J’aime créer à plusieurs, surtout en plein air.', interests: ['peinture', 'dessin', 'musique'], favoriteIds: [] }
  : { profileComplete: false };
const members = ${JSON.stringify(users)};
export const db = null;
export const isValidEmail = email => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim());
export const hasSignInLink = () => false;
export const pendingEmail = () => '';
export const requestSignInLink = async () => {};
export const completeSignIn = async () => {};
export const observeAccount = callback => { observer = callback; queueMicrotask(() => callback(mode === 'request' ? null : me)); return () => {}; };
export const getProfile = async () => ({ ...profile });
export const saveProfile = async (uid, data) => { profile = { ...profile, ...data, profileComplete: true }; };
export const updateProfile = async (uid, changes) => { profile = { ...profile, ...changes }; };
export const setFavorite = async (uid, id, on) => { const list = profile.favoriteIds || []; profile.favoriteIds = on ? [...list, id] : list.filter(x => x !== id); };
export const listMembers = async () => [...members, { uid: me.uid, ...profile }];
export const logout = async () => { observer?.(null); };
`

const activitiesModule = (activities: DemoActivity[], messages: DemoMessage[]) => `
const activities = ${JSON.stringify(activities)};
const messages = ${JSON.stringify(messages)};
let counter = 0;
const clone = value => JSON.parse(JSON.stringify(value));
import * as queue from '/src/lib/waitlist.ts';
import { canJoinDirectly } from '/src/lib/activity.ts';
export class ActivityFullError extends Error { constructor() { super('Cette activité est complète.'); } }
const offerWatchers = new Set();
const emitOffers = () => offerWatchers.forEach(w => w.callback(clone(activities.filter(a => a.offer?.uid === w.uid))));
const apply = async (id, change) => { const a = activities.find(x => x.id === id); const patch = change(a); if (patch) Object.assign(a, patch); emitOffers(); return clone(a); };
export const leaveActivity = (id, uid) => apply(id, a => queue.leave(a, uid));
export const joinWaitlist = (id, uid) => apply(id, a => queue.wait(a, uid));
export const leaveWaitlist = (id, uid) => apply(id, a => queue.stopWaiting(a, uid));
export const acceptOffer = (id, uid) => apply(id, a => queue.accept(a, uid));
export const declineOffer = (id, uid) => apply(id, a => queue.decline(a, uid));
export const refreshQueue = id => apply(id, a => queue.refresh(a));
export const watchMyOffers = (uid, callback) => { const w = { uid, callback }; offerWatchers.add(w); queueMicrotask(emitOffers); return () => offerWatchers.delete(w); };
export const listActivities = async () => clone(activities);
export const getActivity = async id => clone(activities.find(a => a.id === id) ?? null);
export const createActivity = async (draft, organizer) => {
  const created = { ...draft, id: 'nouvelle-' + (++counter), participantIds: [], waitlistIds: [], offer: null, organizerId: organizer.uid, organizerName: organizer.name, organizerPhoto: '', status: 'published', createdAtMs: Date.now(), lastMessage: null };
  activities.unshift(created); return clone(created);
};
export const updateActivity = async (id, draft) => { Object.assign(activities.find(a => a.id === id), draft); };
export const deleteActivity = async id => { activities.splice(activities.findIndex(a => a.id === id), 1); };
export const joinActivity = async (id, uid) => {
  const a = activities.find(x => x.id === id);
  if (!canJoinDirectly(a)) throw new ActivityFullError();
  if (!a.participantIds.includes(uid)) a.participantIds.push(uid);
  return clone(a);
};
const listeners = new Map();
const emit = id => listeners.get(id)?.(clone(messages.filter(m => m.activityId === id).map((m, i) => ({ id: id + '-' + i, ...m }))));
export const watchMessages = (id, callback) => { listeners.set(id, callback); queueMicrotask(() => emit(id)); return () => listeners.delete(id); };
export const sendMessage = async (id, author, text) => {
  const message = { activityId: id, authorId: author.uid, authorName: author.name, authorPhoto: '', text: text.trim(), sentAtMs: Date.now() };
  messages.push(message);
  activities.find(a => a.id === id).lastMessage = { text: message.text, authorName: author.name, authorId: author.uid, sentAtMs: message.sentAtMs };
  emit(id);
};
`

export async function openApp(page: Page, mode: Mode, hash = '') {
  const { users, activities, messages } = demoData()
  await page.route('**/src/services/firebase.ts*', route => route.fulfill({ contentType: 'application/javascript', body: firebaseModule(mode, users) }))
  await page.route('**/src/services/activities.ts*', route => route.fulfill({ contentType: 'application/javascript', body: activitiesModule(activities, messages) }))
  await page.route('**/src/services/places.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const suggestAddresses = async () => []; export const resolveAddress = async () => null;' }))
  await page.route('**/src/services/weather.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export const dayForecast = async () => ({ label: 'Éclaircies', icon: 'cloud-sun', min: 8, max: 14, rain: 10 });" }))
  // Le fond de carte OpenStreetMap n'est pas nécessaire aux vérifications.
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ status: 204, body: '' }))
  await page.goto(`/${hash}`)
  return { users, activities, messages }
}

/** Vérifie polices et visuels réellement chargés, l'absence de défilement horizontal, puis enregistre une capture. */
export async function capture(page: Page, testInfo: TestInfo, name: string, selector?: string) {
  const assets = await page.evaluate(async selector => {
    await document.fonts.ready
    const images = selector ? Array.from(document.querySelectorAll<HTMLImageElement>(selector)) : []
    images.forEach(image => { image.loading = 'eager' })
    await Promise.all(images.map(image => image.decode().catch(() => undefined)))
    const loaded = (family: string) => Array.from(document.fonts).some(font => font.family.replaceAll('"', '') === family && font.status === 'loaded')
    return { imagesLoaded: !selector || (images.length > 0 && images.every(image => image.naturalWidth > 0)), poppins: loaded('Poppins'), sigmar: loaded('Sigmar One') }
  }, selector)
  expect(assets).toEqual({ imagesLoaded: true, poppins: true, sigmar: true })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(name + '.png'), fullPage: true })
}
