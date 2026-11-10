import { expect, type Page, type TestInfo } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

// Les services Firebase, Places et météo sont remplacés uniquement dans le
// navigateur de test : aucun e-mail réel, aucune écriture Firestore, aucun appel facturable.
// Les données viennent du même générateur que le jeu de démonstration, recalculé à la date du jour.
export type Mode = 'request' | 'profile' | 'app' | 'app-no-location'
export const ME = { uid: 'preview-user', email: 'preview@example.com' }

interface DemoUser { uid: string; firstName: string; lastName: string; photoUrl?: string; bio?: string; interests?: string[] }
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
  // Messagerie privée : une conversation non lue (un organisateur lui a écrit) et une conversation lue.
  const [first, second] = data.users.filter(u => u.uid !== ME.uid)
  const now = Date.now()
  const chats = [
    { other: first!.uid, activityTitle: upcoming[1]?.title, activityId: upcoming[1]?.id, read: false, messages: [{ from: ME.uid, text: 'Bonjour ! Faut-il apporter son matériel ?', at: now - 5 * 3600 * 1000 }, { from: first!.uid, text: 'Non, tout est fourni, viens comme tu es !', at: now - 40 * 60 * 1000 }] },
    { other: second!.uid, read: true, messages: [{ from: second!.uid, text: 'Merci pour l’atelier de samedi !', at: now - 2 * 86400 * 1000 }, { from: ME.uid, text: 'Avec plaisir, à bientôt !', at: now - 2 * 86400 * 1000 + 600000 }] },
  ]
  const users = data.users.map(({ uid, firstName, lastName, photoUrl, bio, interests }) => ({ uid, firstName, lastName, photoUrl, bio, interests }))
  return { users, activities, messages: data.messages.filter(m => ids.has(m.activityId)), chats }
}

const firebaseModule = (mode: Mode, users: DemoUser[]) => `
const mode = ${JSON.stringify(mode)};
const me = ${JSON.stringify(ME)};
let observer;
let profile = mode.startsWith('app')
  ? { firstName: 'Camille', lastName: 'Martin', userType: 'participant', address: mode === 'app-no-location' ? '' : 'Croix-Rousse, Lyon 4e', addressLat: mode === 'app-no-location' ? null : 45.7768, addressLng: mode === 'app-no-location' ? null : 4.8312, photoUrl: '', profileComplete: true, bio: 'J’aime créer à plusieurs, surtout en plein air.', interests: ['peinture', 'dessin', 'musique'], favoriteIds: [] }
  : { profileComplete: false };
const members = ${JSON.stringify(users)};
export const db = null;
export const isValidEmail = email => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim());
export const hasSignInLink = () => false;
export const pendingSocialProvider = () => null;
export const clearPendingSocialProvider = () => {};
export const rememberedSessionChoice = () => false;
export const setAuthPersistence = async () => {};
export const pendingEmail = () => '';
export const requestSignInLink = async () => {};
export const completeSignIn = async () => {};
// Fenêtre Google simulée : la session s'ouvre avec le nom et la photo du compte Google.
export const signInWithSocialProvider = async () => { const user = { ...me, displayName: 'Camille Martin', photoURL: 'https://lh3.googleusercontent.com/a/photo-camille', emailVerified: true }; observer?.(user); return { user }; };
export const consumeSocialRedirect = async () => null;
export const observeAccount = callback => { observer = callback; queueMicrotask(() => callback(mode === 'request' ? null : me)); return () => {}; };
export const getProfile = async () => ({ ...profile });
export const saveProfile = async (uid, data) => { profile = { ...profile, ...data, profileComplete: true }; };
export const saveOnboardingProgress = async (uid, data, step) => { profile = { ...profile, ...data, profileComplete: false, onboardingStep: step }; };
export const updateProfile = async (uid, changes) => { profile = { ...profile, ...changes }; };
export const setFavorite = async (uid, id, on) => { const list = profile.favoriteIds || []; profile.favoriteIds = on ? [...list, id] : list.filter(x => x !== id); };
export const listMembers = async () => [...members, { uid: me.uid, firstName: profile.firstName, lastName: profile.lastName, photoUrl: profile.photoUrl, bio: profile.bio, interests: profile.interests }];
export const logout = async () => { observer?.(null); };
export const idToken = async () => 'jeton-de-test';
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
  emitMine();
};
// Mes activités en temps réel (groupes de discussion).
const mineWatchers = new Set();
const emitMine = () => mineWatchers.forEach(w => w.callback(clone(activities.filter(a => a.organizerId === w.uid || a.participantIds.includes(w.uid)))));
export const watchMyActivities = (uid, callback) => { const w = { uid, callback }; mineWatchers.add(w); queueMicrotask(emitMine); return () => mineWatchers.delete(w); };
// Pour les tests : un autre membre écrit dans un groupe.
window.__novartTest = { receiveGroupMessage: (id, authorId, authorName, text) => {
  const message = { activityId: id, authorId, authorName, authorPhoto: '', text, sentAtMs: Date.now() };
  messages.push(message);
  activities.find(a => a.id === id).lastMessage = { text, authorName, authorId, sentAtMs: message.sentAtMs };
  emit(id);
  emitMine();
} };
`

type DemoChat = ReturnType<typeof demoData>['chats'][number]
const messagesModule = (chats: DemoChat[]) => `
const me = ${JSON.stringify(ME.uid)};
export const chatIdFor = (a, b) => [a, b].sort().join('__');
export const otherMember = (chat, uid) => chat.memberIds.find(id => id !== uid) ?? uid;
export const isUnread = (chat, uid) => !!chat.lastMessage && chat.lastMessage.authorId !== uid && chat.lastMessage.sentAtMs > (chat.readAtMs?.[uid] ?? 0);
const chats = ${JSON.stringify(chats)}.map(c => {
  const last = c.messages[c.messages.length - 1];
  return { id: chatIdFor(me, c.other), memberIds: [me, c.other].sort(), activityId: c.activityId, activityTitle: c.activityTitle,
    lastMessage: { text: last.text, authorId: last.from, sentAtMs: last.at }, readAtMs: { [me]: c.read ? last.at + 1 : 0 }, updatedAtMs: last.at,
    messages: c.messages.map((m, i) => ({ id: 'm' + i, authorId: m.from, text: m.text, sentAtMs: m.at })) };
});
const clone = value => JSON.parse(JSON.stringify(value));
const chatWatchers = new Set();
const messageWatchers = new Map();
const publish = () => {
  const list = clone(chats.map(({ messages, ...c }) => c)).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  chatWatchers.forEach(cb => cb(list));
  messageWatchers.forEach((cb, id) => cb(clone(chats.find(c => c.id === id)?.messages ?? [])));
};
export const watchMyChats = (uid, cb) => { chatWatchers.add(cb); queueMicrotask(publish); return () => chatWatchers.delete(cb); };
export const watchPrivateMessages = (id, cb) => { messageWatchers.set(id, cb); queueMicrotask(publish); return () => messageWatchers.delete(id); };
export const sendPrivateMessage = async (from, to, text, context) => {
  const id = chatIdFor(from, to);
  let chat = chats.find(c => c.id === id);
  if (!chat) { chat = { id, memberIds: [from, to].sort(), readAtMs: {}, messages: [] }; chats.push(chat); }
  const sentAtMs = Date.now();
  chat.messages.push({ id: 'm' + chat.messages.length, authorId: from, text: text.trim(), sentAtMs });
  Object.assign(chat, { lastMessage: { text: text.trim(), authorId: from, sentAtMs }, updatedAtMs: sentAtMs, readAtMs: { ...chat.readAtMs, [from]: sentAtMs } }, context ?? {});
  publish();
  return id;
};
export const markChatRead = async (id, uid) => { const chat = chats.find(c => c.id === id); if (chat) { chat.readAtMs = { ...chat.readAtMs, [uid]: Date.now() }; publish(); } };
`

export async function openApp(page: Page, mode: Mode, hash = '') {
  const { users, activities, messages, chats } = demoData()
  await page.route('**/src/services/firebase.ts*', route => route.fulfill({ contentType: 'application/javascript', body: firebaseModule(mode, users) }))
  await page.route('**/src/services/activities.ts*', route => route.fulfill({ contentType: 'application/javascript', body: activitiesModule(activities, messages) }))
  await page.route('**/src/services/messages.ts*', route => route.fulfill({ contentType: 'application/javascript', body: messagesModule(chats) }))
  // Envoi de photo simulé : l'image réduite par le navigateur est « stockée » et resservie.
  let uploaded: Buffer | undefined
  await page.route('**/src/services/uploads.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
const API = 'https://api.novart.test';
export class UploadError extends Error { constructor(code) { super(code); this.code = code; } }
export const uploadsEnabled = () => true;
export const isUploadedFile = url => url.startsWith(API + '/files/');
export const uploadCover = async (image, token) => {
  if (token !== 'jeton-de-test') throw new UploadError('unauthenticated');
  const response = await fetch(API + '/uploads/cover', { method: 'POST', headers: { 'content-type': image.type }, body: image });
  return (await response.json()).url;
};` }))
  await page.route('https://api.novart.test/**', async route => {
    if (route.request().method() === 'POST') { uploaded = route.request().postDataBuffer() ?? undefined; return route.fulfill({ status: 201, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ url: 'https://api.novart.test/files/covers/preview-user/1-0123456789ab.webp' }) }) }
    return route.fulfill({ status: uploaded ? 200 : 404, contentType: 'image/webp', body: uploaded ?? '' })
  })
  await page.route('**/src/services/places.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const suggestAddresses = async () => []; export const resolveAddress = async () => null;' }))
  await page.route('**/src/services/weather.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export const dayForecast = async () => ({ label: 'Éclaircies', icon: 'cloud-sun', min: 8, max: 14, rain: 10 });" }))
  // Le fond de carte OpenStreetMap n'est pas nécessaire aux vérifications.
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ status: 204, body: '' }))
  await page.goto(`/${hash}`)
  return { users, activities, messages, chats }
}

/** Vérifie polices et visuels réellement chargés, l'absence de défilement horizontal, puis enregistre une capture. */
export async function capture(page: Page, testInfo: TestInfo, name: string, selector?: string) {
  const assets = await page.evaluate(async selector => {
    await document.fonts.load('700 1rem Fredoka')
    await document.fonts.load('700 1rem Caveat')
    await document.fonts.ready
    const images = selector ? Array.from(document.querySelectorAll<HTMLImageElement>(selector)) : []
    images.forEach(image => { image.loading = 'eager' })
    await Promise.all(images.map(image => image.decode().catch(() => undefined)))
    const loaded = (family: string) => Array.from(document.fonts).some(font => font.family.replaceAll('"', '') === family && font.status === 'loaded')
    return { imagesLoaded: !selector || (images.length > 0 && images.every(image => image.naturalWidth > 0)), poppins: loaded('Poppins'), caveat: loaded('Caveat'), fredoka: loaded('Fredoka') }
  }, selector)
  expect(assets).toEqual({ imagesLoaded: true, poppins: true, caveat: true, fredoka: true })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(name + '.png'), fullPage: true })
}
