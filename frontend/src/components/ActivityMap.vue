<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Point } from '@/lib/activity'

// Carte Leaflet / OpenStreetMap des activités (maquettes 09 et 20).
export interface MapPoint { id: string; lat: number | null; lng: number | null; label?: string; title?: string }
// center : la carte s'ouvre centrée sur ce point (accueil) au lieu d'englober toutes les activités.
const props = withDefaults(defineProps<{ points: MapPoint[]; origin?: Point | null; selectedId?: string; label?: string; zoom?: number; center?: Point | null }>(), { label: 'Carte des activités', zoom: 14 })
const emit = defineEmits<{ select: [id: string] }>()
const container = ref<HTMLDivElement | null>(null)
let map: L.Map | undefined
let layer: L.LayerGroup | undefined
let observer: ResizeObserver | undefined

const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const pin = (selected: boolean, label?: string) => L.divIcon({
  className: 'map-pin-icon',
  html: `<span class="map-pin${selected ? ' is-selected' : ''}"><svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 31s10-10.2 10-18A10 10 0 0 0 2 13c0 7.8 10 18 10 18Z"/><circle cx="12" cy="12.5" r="4.2"/></svg>${label ? `<span class="map-pin__label">${escape(label)}</span>` : ''}</span>`,
  iconSize: [34, 44], iconAnchor: [17, 42],
})
const valid = (p: MapPoint) => typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng)

function render(fit: boolean) {
  if (!map || !layer) return
  layer.clearLayers()
  const bounds: L.LatLngTuple[] = []
  if (props.origin) {
    L.circle([props.origin.lat, props.origin.lng], { radius: 350, stroke: false, fillColor: '#781C27', fillOpacity: 0.12 }).addTo(layer)
    L.circleMarker([props.origin.lat, props.origin.lng], { radius: 7, color: '#FFFBFB', weight: 3, fillColor: '#781C27', fillOpacity: 1 }).bindTooltip('Toi').addTo(layer)
  }
  for (const point of props.points.filter(valid)) {
    const position: L.LatLngTuple = [point.lat as number, point.lng as number]
    bounds.push(position)
    const marker = L.marker(position, { icon: pin(point.id === props.selectedId, point.label), title: point.title, keyboard: true, zIndexOffset: point.id === props.selectedId ? 1000 : 0 })
    marker.on('click', () => emit('select', point.id))
    marker.addTo(layer)
  }
  if (!fit) return
  if (props.center) { map.setView([props.center.lat, props.center.lng], props.zoom); return }
  if (bounds.length === 1 && !props.origin) map.setView(bounds[0]!, props.zoom)
  else if (bounds.length) map.fitBounds(L.latLngBounds(props.origin ? [...bounds, [props.origin.lat, props.origin.lng]] : bounds), { padding: [36, 36], maxZoom: 15 })
  else if (props.origin) map.setView([props.origin.lat, props.origin.lng], 13)
}

onMounted(() => {
  if (!container.value) return
  map = L.map(container.value, { scrollWheelZoom: false, zoomControl: false }).setView([45.7578, 4.832], 13)
  L.control.zoom({ position: 'topright' }).addTo(map)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map)
  layer = L.layerGroup().addTo(map)
  render(true)
  observer = new ResizeObserver(() => map?.invalidateSize())
  observer.observe(container.value)
})
watch(() => props.points, () => render(!props.center), { deep: true })
watch(() => [props.origin, props.center], () => render(true), { deep: true })
watch(() => props.selectedId, () => {
  render(false)
  const point = props.points.find(p => p.id === props.selectedId)
  if (map && point && valid(point)) map.panTo([point.lat as number, point.lng as number])
})
defineExpose({
  /** Recentre la carte (bouton « Me localiser »). */
  recenter(point: Point, zoom = props.zoom) { map?.setView([point.lat, point.lng], zoom) },
})
onBeforeUnmount(() => { observer?.disconnect(); map?.remove(); map = undefined; layer = undefined })
</script>
<template><div ref="container" class="activity-map" role="region" :aria-label="label"></div></template>
