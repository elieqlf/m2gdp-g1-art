<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Point } from '@/lib/activity'

// Carte Leaflet / OpenStreetMap des activités (maquettes 09 et 20).
export interface MapPoint { id: string; lat: number | null; lng: number | null; title?: string; discipline?: string }
const props = withDefaults(defineProps<{ points: MapPoint[]; origin?: Point | null; selectedId?: string; label?: string; zoom?: number }>(), { label: 'Carte des activités', zoom: 14 })
const emit = defineEmits<{ select: [id: string] }>()
const container = ref<HTMLDivElement | null>(null)
let map: L.Map | undefined
let layer: L.LayerGroup | undefined
let observer: ResizeObserver | undefined

const glyphs: Record<string, string> = {
  peinture: '<path d="M12 3a9 9 0 1 0 0 18h1.2a1.7 1.7 0 0 0 1.2-2.9 1.6 1.6 0 0 1 1.2-2.7H18a3 3 0 0 0 3-3c0-5.2-4-9.4-9-9.4Z"/><circle cx="7.5" cy="11" r=".8"/><circle cx="10" cy="7.5" r=".8"/><circle cx="14" cy="7.5" r=".8"/>',
  dessin: '<path d="m15 5 4 4M4 20l4-.9L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/>',
  musique: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  chant: '<path d="M12 3v11"/><path d="M8 7a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0Z"/><path d="M5 12v1a7 7 0 0 0 14 0v-1M12 20v2m-4 0h8"/>',
  danse: '<circle cx="12" cy="4.5" r="1.7"/><path d="m10 9-3 3 3 2 2-3 3 2 2-3m-8-1 3 2 1 5-3 4m4-7-1 4 3 3"/>',
  photo: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m8 6 1.5-2h5L16 6"/><circle cx="12" cy="13" r="3.5"/>',
  theatre: '<path d="M12 5c-4-3-8-1-9 2 0 5 3 9 7 10m2-12c4-3 8-1 9 2 0 5-3 9-7 10"/><path d="M8 9h.01M16 9h.01M7 13c1 1 2 1 3 0m4 0c1 1 2 1 3 0M9 20l3-2 3 2"/>',
  'street-art': '<path d="M8 4h8l1 3H7l1-3Zm0 3h8v13H8zM11 4V2h2v2m-2 8h2"/>',
  artisanat: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="m8 7 12 12M8 17 20 5M11 12l-2 2m5-5 2-2"/>',
  ecriture: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  'arts-plastiques': '<path d="M12 3a9 9 0 1 0 0 18h1.2a1.7 1.7 0 0 0 1.2-2.9 1.6 1.6 0 0 1 1.2-2.7H18a3 3 0 0 0 3-3c0-5.2-4-9.4-9-9.4Z"/><circle cx="7.5" cy="11" r=".8"/><circle cx="10" cy="7.5" r=".8"/><circle cx="14" cy="7.5" r=".8"/>',
  autre: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
}
const pin = (selected: boolean, discipline?: string) => L.divIcon({
  className: 'map-pin-icon',
  html: `<span class="map-pin${selected ? ' is-selected' : ''}" aria-hidden="true"><svg class="map-pin__art" viewBox="0 0 48 56"><path class="map-pin__body" d="M24 54S4 34 4 22a20 20 0 1 1 40 0C44 34 24 54 24 54Z"/><circle class="map-pin__face" cx="24" cy="22" r="14"/><g class="map-pin__glyph" transform="translate(12 10)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${glyphs[discipline ?? ''] ?? '<path d="M12 21s-8-6.1-8-12a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 5.9-8 12-8 12Z"/>'}</g></svg></span>`,
  iconSize: [48, 56], iconAnchor: [24, 54],
})
const clusterPin = (count: number) => L.divIcon({
  className: 'map-cluster-icon',
  html: `<span class="map-cluster" aria-hidden="true"><span>${count}</span></span>`,
  iconSize: [46, 46], iconAnchor: [23, 23],
})
const valid = (p: MapPoint) => typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng)
const neutralCenter: L.LatLngTuple = [46.6, 2.4]

function render(fit: boolean) {
  if (!map || !layer) return
  layer.clearLayers()
  const bounds: L.LatLngTuple[] = []
  if (props.origin) {
    L.circle([props.origin.lat, props.origin.lng], { radius: 350, stroke: false, fillColor: '#781C27', fillOpacity: 0.12 }).addTo(layer)
    L.circleMarker([props.origin.lat, props.origin.lng], { radius: 7, color: '#FFFBFB', weight: 3, fillColor: '#781C27', fillOpacity: 1 }).bindTooltip('Toi').addTo(layer)
  }
  const groups = new Map<string, { x: number; y: number; points: MapPoint[] }>()
  const selected = props.points.find(point => point.id === props.selectedId && valid(point))
  const points = props.points.filter(valid)
  for (const point of points) {
    const position: L.LatLngTuple = [point.lat as number, point.lng as number]
    bounds.push(position)
    if (point.id === selected?.id) continue
    const projected = map.project(position, map.getZoom())
    const cellX = Math.floor(projected.x / 96)
    const cellY = Math.floor(projected.y / 96)
    const key = `${cellX}:${cellY}`
    const group = groups.get(key) ?? { x: (cellX + 0.5) * 96, y: (cellY + 0.5) * 96, points: [] }
    group.points.push(point)
    groups.set(key, group)
  }
  const addActivityMarker = (point: MapPoint, isSelected = false) => {
    const position: L.LatLngTuple = [point.lat as number, point.lng as number]
    L.marker(position, { icon: pin(isSelected, point.discipline), title: point.title, alt: point.title, keyboard: true, zIndexOffset: isSelected ? 1000 : 0 })
      .on('click', () => emit('select', point.id))
      .addTo(layer!)
  }
  if (selected) addActivityMarker(selected, true)
  for (const group of groups.values()) {
    if (group.points.length === 1) {
      addActivityMarker(group.points[0]!)
      continue
    }
    const center = map.unproject(L.point(group.x, group.y), map.getZoom())
    const groupBounds = L.latLngBounds(group.points.map(point => [point.lat as number, point.lng as number] as L.LatLngTuple))
    const marker = L.marker(center, { icon: clusterPin(group.points.length), title: `${group.points.length} activités à proximité`, alt: `${group.points.length} activités à proximité`, keyboard: true, zIndexOffset: 500 })
    marker.on('click', () => {
      if (!map) return
      if (map.getZoom() >= 17) emit('select', group.points[0]!.id)
      else map.fitBounds(groupBounds, { padding: [50, 50], maxZoom: 18 })
    })
    marker.addTo(layer)
  }
  if (!fit) return
  if (bounds.length === 1 && !props.origin) map.setView(bounds[0]!, props.zoom)
  else if (bounds.length) map.fitBounds(L.latLngBounds(props.origin ? [...bounds, [props.origin.lat, props.origin.lng]] : bounds), { padding: [36, 36], maxZoom: 15 })
  else if (props.origin) map.setView([props.origin.lat, props.origin.lng], 13)
  else map.setView(neutralCenter, 5)
}

onMounted(() => {
  if (!container.value) return
  // Vue neutre avant que les résultats arrivent; aucune adresse de membre n'est inférée.
  map = L.map(container.value, { scrollWheelZoom: false, zoomControl: false }).setView(neutralCenter, 5)
  L.control.zoom({ position: 'topright' }).addTo(map)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map)
  layer = L.layerGroup().addTo(map)
  map.on('zoomend moveend', renderViewport)
  render(true)
  // render(true) peut modifier le zoom après le premier calcul des groupes.
  // Recrée les repères au niveau final pour éviter de masquer des activités.
  render(false)
  observer = new ResizeObserver(() => map?.invalidateSize())
  observer.observe(container.value)
})
function renderViewport() { render(false) }
watch(() => [props.points, props.origin], () => render(true), { deep: true })
watch(() => props.selectedId, () => {
  render(false)
  const point = props.points.find(p => p.id === props.selectedId)
  if (map && point && valid(point)) map.panTo([point.lat as number, point.lng as number])
})
onBeforeUnmount(() => { observer?.disconnect(); map?.off('zoomend moveend', renderViewport); map?.remove(); map = undefined; layer = undefined })
</script>
<template><div ref="container" class="activity-map" role="region" :aria-label="label"></div></template>
