<script setup lang="ts"> 
import {onMounted,onBeforeUnmount, ref, watch} from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'


import type { Member } from '@/services/firebase'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,

} from '@/components/ui/card'


//Utilisateurs Transmis via App.vue
const props = defineProps<{
    users: Member[]
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const markerCount = ref(0)

let map: L.Map | undefined 
let markers: L.LayerGroup | undefined 
let resizeObserver: ResizeObserver | undefined

function updateMarkers(){
    if (!map || ! markers) return

    // On retire les anciens markers avant de reconstruire la liste 
    markers.clearLayers()

    const positions : L.LatLngTuple[] = []

    for (const user of props.users){
        const lat = user.addressLat
        const lng = user.addressLng

        // Sécurité qui ignore les profils avec des coo invalides 

        if (
            typeof lat !== 'number' ||
            typeof lng !== 'number' ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat< -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180 
            
        )
        {
            continue
        }

        const position : L.LatLngTuple = [lat,lng]
        positions.push(position)

        // Création de la fiche affichée au clic 
        const popup = document.createElement('div')

        const name = document.createElement('strong')
        name.textContent = 
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        'Utilisateur'


        const role = document.createElement('p')
        role.textContent = 
        user.userType === 'organisateur'
        ? 'Organisateur'
        : user.userType === 'participant'
          ? 'Participant'
          : 'Membre'


          popup.append(name,role)

          // Chaque point représente un utilisateur sur la carte

             L.circleMarker(position, {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 1,
    })
      .bindPopup(popup)
      .addTo(markers)
  } // Fin de la boucle sur les utilisateurs.

  markerCount.value = positions.length

  if (positions.length > 0) {
    map.fitBounds(L.latLngBounds(positions), {
      padding: [40, 40],
      maxZoom: 13,
    })
  } else {
    map.setView([46.6, 2.5], 5)
  }
} 


  map = L.map(mapContainer.value, {
    scrollWheelZoom: false,
  }).setView([46.6, 2.5], 5)

  // Leaflet affiche les images du fond de carte OpenStreetMap.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  markers = L.layerGroup().addTo(map)
  updateMarkers()

  // Adapter la carte si son conteneur change de taille.
  resizeObserver = new ResizeObserver(() => {
    map?.invalidateSize()
  })
  resizeObserver.observe(mapContainer.value)
})

// Mettre à jour la carte quand Firebase fournit la liste.
watch(() => props.users, updateMarkers, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
  map = undefined
  markers = undefined
})
</script>

<template>
  <Card class="mt-8">
    <CardHeader>
      <CardTitle>Carte des utilisateurs</CardTitle>
      <CardDescription>
        Cliquez sur un point pour découvrir le profil.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div
        ref="mapContainer"
        class="users-map"
        role="region"
        aria-label="Carte des utilisateurs"
      ></div>

      <p class="mt-3 text-sm text-muted-foreground" aria-live="polite">
        <template v-if="markerCount === 0">
          Aucun utilisateur ne possède encore de coordonnées
          géographiques.
        </template>
        <template v-else>
          {{ markerCount }} utilisateur{{ markerCount > 1 ? 's' : '' }}
          sur la carte.
        </template>
      </p>
    </CardContent>
  </Card>
</template>

<style scoped>
.users-map {
  height: 400px;
  width: 100%;
  border-radius: 8px;
  z-index: 0;
}
</style>









