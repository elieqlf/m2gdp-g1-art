import { GOOGLE_PLACES_API_KEY } from "../places-config.js";

// Tout passe par Places API (New) : Geocoding API ne supporte pas les clés
// restreintes par référent HTTP, donc on récupère les coordonnées via
// Place Details (New) avec le placeId plutôt que via Geocoding.
const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

/**
 * Branche un autocomplete d'adresse (Google Places API New) sur un <input>.
 * Réutilisable pour tout formulaire ayant besoin d'une adresse (inscription,
 * création d'annonce...).
 *
 * @param {HTMLInputElement} inputEl
 * @param {{ onSelect?: (place: {address: string, placeId: string, lat?: number, lng?: number}) => void }} options
 */
export function attachAddressAutocomplete(inputEl, { onSelect } = {}) {
  const wrapper = inputEl.parentElement;
  if (getComputedStyle(wrapper).position === "static") {
    wrapper.style.position = "relative";
  }

  const dropdown = document.createElement("ul");
  dropdown.className = "address-suggestions";
  dropdown.hidden = true;
  inputEl.insertAdjacentElement("afterend", dropdown);

  let debounceTimer;
  let sessionToken = crypto.randomUUID();

  inputEl.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = inputEl.value.trim();
    if (query.length < 3) {
      hideDropdown();
      return;
    }
    debounceTimer = setTimeout(() => fetchSuggestions(query), 300);
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) hideDropdown();
  });

  function hideDropdown() {
    dropdown.hidden = true;
    dropdown.innerHTML = "";
  }

  async function fetchSuggestions(query) {
    try {
      const res = await fetch(AUTOCOMPLETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify({
          input: query,
          languageCode: "fr",
          regionCode: "FR",
          sessionToken,
        }),
      });
      if (!res.ok) {
        hideDropdown();
        return;
      }
      const data = await res.json();
      renderSuggestions(data.suggestions || []);
    } catch {
      // Réseau indisponible : on n'affiche simplement pas de suggestions,
      // l'utilisateur peut toujours saisir l'adresse manuellement.
      hideDropdown();
    }
  }

  function renderSuggestions(suggestions) {
    dropdown.innerHTML = "";
    const predictions = suggestions.map((s) => s.placePrediction).filter(Boolean);
    if (!predictions.length) {
      hideDropdown();
      return;
    }
    for (const prediction of predictions) {
      const li = document.createElement("li");
      li.textContent = prediction.text?.text ?? "";
      li.addEventListener("mousedown", (event) => {
        event.preventDefault(); // évite que le blur ferme la liste avant le clic
        selectPlace(prediction);
      });
      dropdown.appendChild(li);
    }
    dropdown.hidden = false;
  }

  async function selectPlace(prediction) {
    const address = prediction.text?.text ?? "";
    const placeId = prediction.placeId;
    const usedSessionToken = sessionToken;
    inputEl.value = address;
    hideDropdown();
    sessionToken = crypto.randomUUID(); // nouvelle session de facturation Places

    let coords = {};
    try {
      const detailsRes = await fetch(`${PLACE_DETAILS_URL}/${placeId}?sessionToken=${usedSessionToken}`, {
        headers: {
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "location",
        },
      });
      const details = await detailsRes.json();
      if (details.location) {
        coords = { lat: details.location.latitude, lng: details.location.longitude };
      }
    } catch {
      // Résolution des coordonnées best-effort : l'adresse texte reste valable sans elles.
    }

    onSelect?.({ address, placeId, ...coords });
  }
}
