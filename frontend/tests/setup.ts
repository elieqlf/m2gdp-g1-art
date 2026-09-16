// jsdom (environnement des tests) n'implémente pas ResizeObserver, utilisé
// par UsersMap.vue pour adapter la carte Leaflet à son conteneur.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
}
