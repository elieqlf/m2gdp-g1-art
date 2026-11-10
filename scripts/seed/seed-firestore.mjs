// Charge le jeu de démonstration NOVART dans Cloud Firestore (projet novart-109bf).
//
// Prérequis (une seule fois) :
//   1. Console Firebase > Paramètres du projet > Comptes de service >
//      « Générer une nouvelle clé privée ». Garder le fichier HORS du dépôt.
//   2. cd scripts/seed && npm install
//
// Lancement, depuis scripts/seed :
//   GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json node seed-firestore.mjs
//   Option --reset : supprime d'abord les documents de démonstration (demo: true).
//   Option --date=AAAA-MM-JJ : date de référence (par défaut aujourd'hui).
//
// Seuls des documents marqués `demo: true` sont créés ou supprimés : les comptes
// et activités réels ne sont jamais modifiés.
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { buildDataset } from './generate-data.mjs'

const args = process.argv.slice(2)
const reset = args.includes('--reset')
const dateArg = args.find(a => a.startsWith('--date='))?.slice(7)
const baseDate = dateArg ? new Date(`${dateArg}T12:00:00`) : new Date()

initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || 'novart-109bf' })
const db = getFirestore()

async function commitInChunks(operations) {
  for (let i = 0; i < operations.length; i += 400) {
    const batch = db.batch()
    for (const apply of operations.slice(i, i + 400)) apply(batch)
    await batch.commit()
    process.stdout.write('.')
  }
}

async function removeDemoData() {
  const activities = await db.collection('activities').where('demo', '==', true).get()
  const ops = []
  for (const activity of activities.docs) {
    const msgs = await activity.ref.collection('messages').get()
    msgs.docs.forEach(m => ops.push(b => b.delete(m.ref)))
    ops.push(b => b.delete(activity.ref))
  }
  const chats = await db.collection('privateChats').where('demo', '==', true).get()
  for (const chat of chats.docs) {
    const msgs = await chat.ref.collection('messages').get()
    msgs.docs.forEach(m => ops.push(b => b.delete(m.ref)))
    ops.push(b => b.delete(chat.ref))
  }
  const users = await db.collection('users').where('demo', '==', true).get()
  users.docs.forEach(u => {
    ops.push(b => b.delete(u.ref))
    ops.push(b => b.delete(db.collection('publicProfiles').doc(u.id)))
  })
  await commitInChunks(ops)
  console.log(`\nSupprimé : ${activities.size} activités, ${chats.size} conversations privées et ${users.size} membres de démonstration.`)
}

async function main() {
  if (reset) await removeDemoData()
  const { users, activities, messages, privateChats } = buildDataset(baseDate)
  const ops = []
  for (const { uid, ...profile } of users) {
    ops.push(b => b.set(db.collection('users').doc(uid), profile))
    const { firstName, lastName, photoUrl, bio, interests } = profile
    ops.push(b => b.set(db.collection('publicProfiles').doc(uid), { firstName, lastName, photoUrl, bio, interests }))
  }
  for (const { id, ...activity } of activities) ops.push(b => b.set(db.collection('activities').doc(id), activity))
  for (const { activityId, ...message } of messages) ops.push(b => b.set(db.collection('activities').doc(activityId).collection('messages').doc(), message))
  for (const { id, messages: chatMessages, ...chat } of privateChats) {
    ops.push(b => b.set(db.collection('privateChats').doc(id), chat))
    for (const message of chatMessages) ops.push(b => b.set(db.collection('privateChats').doc(id).collection('messages').doc(), message))
  }
  await commitInChunks(ops)
  console.log(`\nChargé : ${users.length} membres, ${activities.length} activités, ${messages.length} messages, ${privateChats.length} conversations privées (date de référence ${baseDate.toISOString().slice(0, 10)}).`)
}

main().catch(error => { console.error('\nÉchec du chargement :', error.message); process.exit(1) })
