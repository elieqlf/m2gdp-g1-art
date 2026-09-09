// Config Firebase côté client (public par nature — protégée par les règles de
// sécurité Firestore/Auth, pas par le secret). Ne pas mettre la clé de service
// (private_key) ici : elle reste uniquement côté Worker (secrets Cloudflare).
export const firebaseConfig = {
  projectId: "novart-109bf",
  appId: "1:801779680703:web:8b9dbd08909c560df08d0a",
  databaseURL: "https://novart-109bf-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "novart-109bf.firebasestorage.app",
  apiKey: "AIzaSyBPfxMPOz-R_Cnel_Tw5BfbyJFNurh0GSk",
  authDomain: "novart-109bf.firebaseapp.com",
  messagingSenderId: "801779680703",
};
