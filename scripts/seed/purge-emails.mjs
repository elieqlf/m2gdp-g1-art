// RGPD : retire le champ `email` de tous les profils Firestore (users/{uid}).
// L'e-mail reste dans Firebase Authentication, visible uniquement de l'équipe.
// Lancement, depuis scripts/seed :
//   GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json npm run purge-emails
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || 'novart-109bf' })
const db = getFirestore()

const users = await db.collection('users').get()
const withEmail = users.docs.filter(doc => doc.get('email') !== undefined)
for (let i = 0; i < withEmail.length; i += 400) {
  const batch = db.batch()
  withEmail.slice(i, i + 400).forEach(doc => batch.update(doc.ref, { email: FieldValue.delete() }))
  await batch.commit()
}
console.log(`E-mail retiré de ${withEmail.length} profil(s) sur ${users.size}.`)
