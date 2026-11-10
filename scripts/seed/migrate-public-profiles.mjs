// Copie les profils déjà complets vers la collection publique en ne gardant
// que les champs visibles dans la communauté. Les adresses, coordonnées et
// e-mails restent exclusivement dans users/{uid}.
// Lancement : GOOGLE_APPLICATION_CREDENTIALS=/chemin/cle.json npm run migrate-public-profiles
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || 'novart-109bf' })
const db = getFirestore()
const users = await db.collection('users').where('profileComplete', '==', true).get()
let totalMigrated = 0

for (let start = 0; start < users.docs.length; start += 400) {
  const batch = db.batch()
  let migrated = 0
  for (const user of users.docs.slice(start, start + 400)) {
    const data = user.data()
    if (typeof data.firstName !== 'string' || !data.firstName.trim()) continue
    const interests = Array.isArray(data.interests) ? data.interests.filter(value => typeof value === 'string').slice(0, 12) : []
    batch.set(db.collection('publicProfiles').doc(user.id), {
      firstName: typeof data.firstName === 'string' ? data.firstName.slice(0, 60) : '',
      lastName: typeof data.lastName === 'string' ? data.lastName.slice(0, 80) : '',
      photoUrl: typeof data.photoUrl === 'string' && data.photoUrl.length <= 750000 ? data.photoUrl : '',
      bio: typeof data.bio === 'string' ? data.bio.slice(0, 160) : '',
      interests,
    })
    migrated++
  }
  if (migrated) {
    await batch.commit()
    totalMigrated += migrated
  }
}
console.log(`Profils publics migrés : ${totalMigrated}/${users.size}. Aucune adresse ou coordonnée copiée.`)
