import { computed, ref } from 'vue'

// Navigation par ancre (#/…) : aucun paramétrage d'hébergement supplémentaire
// et compatible avec le retour du lien magique sur /login.html.
export type RouteName = 'decouvrir' | 'rechercher' | 'activite' | 'participation' | 'modifier' | 'creer' | 'conversations' | 'conversation' | 'mes-activites' | 'profil' | 'profil-modifier' | 'favoris' | 'communaute'
export interface Route { name: RouteName; id?: string; query: Record<string, string> }

export function parseRoute(hash: string): Route {
  const [path = '', search = ''] = hash.replace(/^#\/?/, '').split('?')
  const query = Object.fromEntries(new URLSearchParams(search))
  const [first = '', id, extra] = path.split('/').filter(Boolean).map(decodeURIComponent)
  if (first === 'activite' && id) return { name: extra === 'participation' ? 'participation' : extra === 'modifier' ? 'modifier' : 'activite', id, query }
  if (first === 'conversations' && id) return { name: 'conversation', id, query }
  if (first === 'profil' && id === 'modifier') return { name: 'profil-modifier', query }
  const simple: RouteName[] = ['rechercher', 'creer', 'conversations', 'mes-activites', 'profil', 'favoris', 'communaute']
  return { name: simple.includes(first as RouteName) ? first as RouteName : 'decouvrir', query }
}

const current = ref<Route>(parseRoute(typeof window === 'undefined' ? '' : window.location.hash))
let listening = false
export function useRoute() {
  if (!listening && typeof window !== 'undefined') {
    listening = true
    window.addEventListener('hashchange', () => {
      current.value = parseRoute(window.location.hash)
      window.scrollTo({ top: 0 })
    })
  }
  return computed(() => current.value)
}
export function navigate(path: string, query?: Record<string, string>) {
  const search = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '')).toString() : ''
  const hash = `#/${path.replace(/^\/+/, '')}${search ? `?${search}` : ''}`
  if (window.location.hash === hash) return
  window.location.hash = hash
  current.value = parseRoute(hash)
}
export function goBack(fallback = 'decouvrir') {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback)
}
// Onglet actif de la barre de navigation pour chaque écran.
export const tabOf = (name: RouteName) => ({ rechercher: 'rechercher', creer: 'creer', conversations: 'conversations', conversation: 'conversations', profil: 'profil', 'profil-modifier': 'profil', 'mes-activites': 'profil', favoris: 'profil', communaute: 'profil' } as Record<string, string>)[name] ?? 'decouvrir'
