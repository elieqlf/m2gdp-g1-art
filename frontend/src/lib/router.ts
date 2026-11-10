import { computed, ref } from 'vue'

// Navigation par ancre (#/…) : aucun paramétrage d'hébergement supplémentaire
// et compatible avec le retour du lien magique sur /login.html.
export type RouteName = 'decouvrir' | 'rechercher' | 'activite' | 'participation' | 'modifier' | 'creer' | 'conversations' | 'conversation' | 'mes-activites' | 'profil' | 'profil-modifier' | 'favoris' | 'communaute' | 'notifications' | 'message'
export interface Route { name: RouteName; id?: string; query: Record<string, string> }

export function parseRoute(hash: string): Route {
  const [path = '', search = ''] = hash.replace(/^#\/?/, '').split('?')
  const query = Object.fromEntries(new URLSearchParams(search))
  const [first = '', id, extra] = path.split('/').filter(Boolean).map(decodeURIComponent)
  if (first === 'activite' && id) return { name: extra === 'participation' ? 'participation' : extra === 'modifier' ? 'modifier' : 'activite', id, query }
  if (first === 'conversations' && id) return { name: 'conversation', id, query }
  // Conversation privée avec un membre : #/messages/<uid du membre>?activite=<id>
  if (first === 'messages' && id) return { name: 'message', id, query }
  if (first === 'profil' && id === 'modifier') return { name: 'profil-modifier', query }
  const simple: RouteName[] = ['rechercher', 'creer', 'conversations', 'mes-activites', 'profil', 'favoris', 'communaute', 'notifications']
  return { name: simple.includes(first as RouteName) ? first as RouteName : 'decouvrir', query }
}

const current = ref<Route>(parseRoute(typeof window === 'undefined' ? '' : window.location.hash))
let listening = false
let lastHash = typeof window === 'undefined' ? '' : window.location.hash
let programmaticHash = ''
const routeHistory: string[] = []
export function useRoute() {
  if (!listening && typeof window !== 'undefined') {
    listening = true
    window.addEventListener('hashchange', () => {
      const nextHash = window.location.hash
      if (programmaticHash === nextHash) programmaticHash = ''
      else {
        const backIndex = routeHistory.lastIndexOf(nextHash)
        if (backIndex >= 0) routeHistory.splice(backIndex)
        else if (lastHash !== nextHash) routeHistory.push(lastHash)
      }
      lastHash = nextHash
      current.value = parseRoute(nextHash)
      window.scrollTo({ top: 0 })
    })
  }
  return computed(() => current.value)
}
export function navigate(path: string, query?: Record<string, string>) {
  const hash = routeHash(path, query)
  if (window.location.hash === hash) return
  routeHistory.push(window.location.hash)
  programmaticHash = hash
  window.location.hash = hash
  lastHash = hash
  current.value = parseRoute(hash)
}
export function replaceRoute(path: string, query?: Record<string, string>) {
  const hash = routeHash(path, query)
  if (window.location.hash === hash) return
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`)
  lastHash = hash
  current.value = parseRoute(hash)
}
function routeHash(path: string, query?: Record<string, string>) {
  const search = query ? new URLSearchParams(Object.entries(query).filter(([, value]) => value !== '')).toString() : ''
  return `#/${path.replace(/^\/+/, '')}${search ? `?${search}` : ''}`
}
export function goBack(fallback = 'decouvrir') {
  if (routeHistory.length) window.history.back()
  else navigate(fallback)
}
// Onglet actif de la barre de navigation pour chaque écran.
export const tabOf = (name: RouteName) => ({ rechercher: 'rechercher', creer: 'mes-activites', modifier: 'mes-activites', conversations: 'conversations', conversation: 'conversations', message: 'conversations', notifications: 'profil', profil: 'profil', 'profil-modifier': 'profil', 'mes-activites': 'mes-activites', favoris: 'profil', communaute: 'profil' } as Record<string, string>)[name] ?? 'decouvrir'
