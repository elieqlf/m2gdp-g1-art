// Génère le jeu de données de démonstration NOVART (Métropole de Lyon).
// Usage : node scripts/seed/generate-data.mjs [AAAA-MM-JJ] [--stdout]
// Sans argument, la date de référence est aujourd'hui : les activités sont
// réparties de 30 jours avant à 60 jours après cette date.
// Le résultat est déterministe pour une même date (générateur pseudo-aléatoire à graine fixe).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
export const catalog = JSON.parse(readFileSync(resolve(root, 'frontend/src/data/catalog.json'), 'utf8'))

function prng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Quartiers : coordonnées approximatives du centre de chaque secteur.
export const districts = [
  { id: 'lyon-1-terreaux', label: 'Terreaux, Lyon 1er', postcode: '69001', lat: 45.7676, lng: 4.8336 },
  { id: 'lyon-1-pentes', label: 'Pentes de la Croix-Rousse, Lyon 1er', postcode: '69001', lat: 45.7708, lng: 4.8318 },
  { id: 'lyon-4-croix-rousse', label: 'Croix-Rousse, Lyon 4e', postcode: '69004', lat: 45.7768, lng: 4.8312 },
  { id: 'lyon-2-bellecour', label: 'Bellecour, Lyon 2e', postcode: '69002', lat: 45.7578, lng: 4.8320 },
  { id: 'lyon-2-ainay', label: 'Ainay, Lyon 2e', postcode: '69002', lat: 45.7532, lng: 4.8276 },
  { id: 'lyon-2-confluence', label: 'Confluence, Lyon 2e', postcode: '69002', lat: 45.7425, lng: 4.8185 },
  { id: 'lyon-3-part-dieu', label: 'Part-Dieu, Lyon 3e', postcode: '69003', lat: 45.7608, lng: 4.8565 },
  { id: 'lyon-3-guichard', label: 'Saxe-Guichard, Lyon 3e', postcode: '69003', lat: 45.7590, lng: 4.8478 },
  { id: 'lyon-3-montchat', label: 'Montchat, Lyon 3e', postcode: '69003', lat: 45.7560, lng: 4.8905 },
  { id: 'lyon-5-vieux-lyon', label: 'Vieux Lyon, Lyon 5e', postcode: '69005', lat: 45.7616, lng: 4.8272 },
  { id: 'lyon-5-point-du-jour', label: 'Point du Jour, Lyon 5e', postcode: '69005', lat: 45.7585, lng: 4.7965 },
  { id: 'lyon-6-brotteaux', label: 'Brotteaux, Lyon 6e', postcode: '69006', lat: 45.7678, lng: 4.8530 },
  { id: 'lyon-6-tete-d-or', label: 'Tête d’Or, Lyon 6e', postcode: '69006', lat: 45.7745, lng: 4.8520 },
  { id: 'lyon-7-guillotiere', label: 'Guillotière, Lyon 7e', postcode: '69007', lat: 45.7535, lng: 4.8432 },
  { id: 'lyon-7-jean-mace', label: 'Jean Macé, Lyon 7e', postcode: '69007', lat: 45.7457, lng: 4.8423 },
  { id: 'lyon-7-gerland', label: 'Gerland, Lyon 7e', postcode: '69007', lat: 45.7302, lng: 4.8335 },
  { id: 'lyon-8-monplaisir', label: 'Monplaisir, Lyon 8e', postcode: '69008', lat: 45.7440, lng: 4.8702 },
  { id: 'lyon-8-etats-unis', label: 'États-Unis, Lyon 8e', postcode: '69008', lat: 45.7330, lng: 4.8640 },
  { id: 'lyon-9-vaise', label: 'Vaise, Lyon 9e', postcode: '69009', lat: 45.7742, lng: 4.8045 },
  { id: 'villeurbanne-gratte-ciel', label: 'Gratte-Ciel, Villeurbanne', postcode: '69100', lat: 45.7686, lng: 4.8806 },
  { id: 'villeurbanne-charpennes', label: 'Charpennes, Villeurbanne', postcode: '69100', lat: 45.7702, lng: 4.8632 },
  { id: 'caluire', label: 'Caluire-et-Cuire', postcode: '69300', lat: 45.7953, lng: 4.8462 },
  { id: 'oullins', label: 'Oullins-Pierre-Bénite', postcode: '69600', lat: 45.7148, lng: 4.8078 },
  { id: 'venissieux', label: 'Vénissieux', postcode: '69200', lat: 45.6972, lng: 4.8862 },
  { id: 'bron', label: 'Bron', postcode: '69500', lat: 45.7382, lng: 4.9128 },
  { id: 'ecully', label: 'Écully', postcode: '69130', lat: 45.7742, lng: 4.7772 },
]

// Lieux publics connus (coordonnées approximatives).
const landmarks = [
  ['Parc de la Tête d’Or', 'parc', 'lyon-6-tete-d-or', 45.7772, 4.8558, 'Boulevard des Belges'],
  ['Place Bellecour', 'place', 'lyon-2-bellecour', 45.7578, 4.8320, 'Place Bellecour'],
  ['Place des Terreaux', 'place', 'lyon-1-terreaux', 45.7676, 4.8336, 'Place des Terreaux'],
  ['Jardin des Plantes', 'parc', 'lyon-1-pentes', 45.7709, 4.8296, 'Montée des Carmélites'],
  ['Parc de Gerland', 'parc', 'lyon-7-gerland', 45.7232, 4.8338, 'Allée Pierre de Coubertin'],
  ['Berges du Rhône, Guillotière', 'berges', 'lyon-7-guillotiere', 45.7548, 4.8418, 'Quai Claude Bernard'],
  ['Quai Saint-Antoine', 'berges', 'lyon-2-bellecour', 45.7632, 4.8312, 'Quai Saint-Antoine'],
  ['Parc Blandan', 'parc', 'lyon-7-guillotiere', 45.7448, 4.8560, 'Rue du Repos'],
  ['Place Carnot', 'place', 'lyon-2-ainay', 45.7482, 4.8268, 'Place Carnot'],
  ['Place Sathonay', 'place', 'lyon-1-terreaux', 45.7697, 4.8302, 'Place Sathonay'],
  ['Jardin Rosa Mir', 'parc', 'lyon-4-croix-rousse', 45.7772, 4.8318, 'Grande Rue de la Croix-Rousse'],
  ['Place de la Croix-Rousse', 'place', 'lyon-4-croix-rousse', 45.7745, 4.8318, 'Place de la Croix-Rousse'],
  ['Esplanade de Fourvière', 'place', 'lyon-5-vieux-lyon', 45.7622, 4.8222, 'Place de Fourvière'],
  ['Place Saint-Jean', 'place', 'lyon-5-vieux-lyon', 45.7603, 4.8275, 'Place Saint-Jean'],
  ['Place Jean Macé', 'place', 'lyon-7-jean-mace', 45.7457, 4.8423, 'Place Jean Macé'],
  ['Place Guichard', 'place', 'lyon-3-guichard', 45.7590, 4.8478, 'Place Guichard'],
  ['Parc Bazin', 'parc', 'lyon-3-montchat', 45.7556, 4.8875, 'Rue Ferdinand Buisson'],
  ['Place Ambroise Courtois', 'place', 'lyon-8-monplaisir', 45.7448, 4.8708, 'Place Ambroise Courtois'],
  ['Parc de la Cerisaie', 'parc', 'lyon-4-croix-rousse', 45.7808, 4.8248, 'Rue Chazière'],
  ['Parc de la Feyssine', 'parc', 'villeurbanne-charpennes', 45.7842, 4.8780, 'Avenue Pierre de Coubertin'],
  ['Place Lazare Goujon', 'place', 'villeurbanne-gratte-ciel', 45.7666, 4.8798, 'Place Lazare Goujon'],
  ['Parc de Parilly', 'parc', 'bron', 45.7232, 4.8982, 'Boulevard Émile Bollaert'],
  ['Parc de Lacroix-Laval', 'parc', 'ecully', 45.7862, 4.7442, 'Avenue de Lacroix-Laval'],
  ['Parc du Vallon', 'parc', 'lyon-9-vaise', 45.7880, 4.7960, 'Rue du Vallon'],
  ['Place Valmy', 'place', 'lyon-9-vaise', 45.7745, 4.8055, 'Place Valmy'],
  ['Parc des Berges, Confluence', 'berges', 'lyon-2-confluence', 45.7396, 4.8168, 'Quai Rambaud'],
  ['Parc Chambovet', 'parc', 'lyon-8-monplaisir', 45.7475, 4.8680, 'Rue Chambovet'],
  ['Jardin de la Visitation', 'parc', 'lyon-5-vieux-lyon', 45.7590, 4.8225, 'Montée Saint-Barthélemy'],
  ['Place Ronde de Montchat', 'place', 'lyon-3-montchat', 45.7562, 4.8915, 'Place Ronde'],
  ['Berges de la Saône, Vaise', 'berges', 'lyon-9-vaise', 45.7720, 4.8100, 'Quai Paul Sédallian'],
  ['Médiathèque de Vaise', 'mediatheque', 'lyon-9-vaise', 45.7748, 4.8048, 'Place Valmy'],
  ['Bibliothèque de la Part-Dieu', 'mediatheque', 'lyon-3-part-dieu', 45.7615, 4.8574, 'Rue de Bonnel'],
  ['Médiathèque Jean Macé', 'mediatheque', 'lyon-7-jean-mace', 45.7462, 4.8410, 'Rue Domer'],
  ['Musée des Confluences, parvis', 'musee', 'lyon-2-confluence', 45.7326, 4.8180, 'Quai Perrache'],
  ['Les Subsistances, cour', 'musee', 'lyon-1-pentes', 45.7704, 4.8162, 'Quai Saint-Vincent'],
]

const venuePrefixes = {
  cafe: ['Café des Arts', 'Café Lumière', 'Le Comptoir créatif', 'Café de la Fresque', 'La Tasse bavarde', 'Café Canut', 'Le Petit Carnet', 'Café Pinceau', 'L’Escale associative', 'Café du Rhône'],
  atelier: ['Atelier Terre et Sens', 'Atelier des Pentes', 'L’Établi partagé', 'Atelier Fil d’Or', 'Atelier Pigments', 'Atelier du Passage', 'La Fabrique à motifs', 'Atelier Argile', 'L’Atelier d’à côté', 'Atelier Papier Ciseaux'],
  mjc: ['MJC du quartier', 'Maison pour tous', 'Centre social des Rancy', 'MJC Jean Macé', 'Maison des jeunes et de la culture', 'Espace associatif'],
  studio: ['Studio Mouvement', 'Studio Cadence', 'La Salle des Pas', 'Studio Danse & Co', 'Studio Envol'],
  salle: ['Salle Croche', 'Local de répétition Écho', 'Salle Accord', 'Studio Tempo', 'La Boîte à sons'],
  galerie: ['Galerie Regard', 'Galerie des Traboules', 'Galerie Contraste', 'Espace d’exposition Halle'],
  'tiers-lieu': ['Le Hangar créatif', 'La Friche partagée', 'Le Grand Atelier', 'Tiers-lieu La Ruche', 'Le Local collectif', 'La Cantine des projets'],
}
const streets = ['rue de la République', 'rue Saint-Georges', 'rue Mercière', 'rue des Capucins', 'rue Burdeau', 'rue d’Austerlitz', 'rue Paul Bert', 'rue de Marseille', 'rue Chevreul', 'cours Gambetta', 'rue Duguesclin', 'rue Garibaldi', 'avenue Jean Jaurès', 'rue Saint-Jean', 'rue de Brest', 'rue Victor Hugo', 'rue Pasteur', 'rue de Créqui', 'rue Bossuet', 'rue Tronchet', 'rue Bonnefoi', 'rue Moncey', 'rue Villeroy', 'rue des Tables Claudiennes', 'rue d’Ivry', 'rue Chazière', 'rue Professeur Rochaix', 'avenue Félix Faure', 'rue du Dauphiné', 'rue Marietton']

const cityOf = d => d.postcode.startsWith('6900') ? 'Lyon' : d.label.split(', ').pop()

export function buildVenues(rand) {
  const venues = landmarks.map(([name, type, districtId, lat, lng, street], i) => {
    const d = districts.find(x => x.id === districtId)
    return { id: `venue-${String(i + 1).padStart(3, '0')}`, name, type, districtId, district: d.label, address: `${street}, ${d.postcode} ${cityOf(d)}`, lat, lng }
  })
  let n = venues.length
  for (const [type, names] of Object.entries(venuePrefixes)) {
    for (const name of names) {
      // Chaque lieu fictif est rattaché à un quartier, avec un léger décalage (< 600 m).
      for (let k = 0; k < 2 && n < 140; k++) {
        const d = districts[Math.floor(rand() * districts.length)]
        const lat = +(d.lat + (rand() - 0.5) * 0.009).toFixed(5)
        const lng = +(d.lng + (rand() - 0.5) * 0.012).toFixed(5)
        const fullName = k === 0 ? name : `${name} — ${d.label.split(',')[0]}`
        n++
        venues.push({ id: `venue-${String(n).padStart(3, '0')}`, name: fullName, type, districtId: d.id, district: d.label, address: `${1 + Math.floor(rand() * 98)} ${streets[Math.floor(rand() * streets.length)]}, ${d.postcode} ${cityOf(d)}`, lat, lng })
      }
    }
  }
  return venues
}

const firstNames = ['Julie', 'Thomas', 'Léa', 'Sophie', 'Antoine', 'Camille', 'Max', 'Alex', 'Inès', 'Hugo', 'Chloé', 'Nathan', 'Manon', 'Lucas', 'Emma', 'Yanis', 'Sarah', 'Mehdi', 'Lina', 'Théo', 'Zoé', 'Louis', 'Jade', 'Gabriel', 'Nina', 'Adam', 'Clara', 'Rayan', 'Lou', 'Paul', 'Anaïs', 'Karim', 'Mathilde', 'Arthur', 'Aïcha', 'Jules', 'Elsa', 'Samuel', 'Margaux', 'Ibrahim', 'Rose', 'Victor', 'Salomé', 'Noah', 'Amina', 'Bastien', 'Louise', 'Malik', 'Pauline', 'Ethan', 'Fatou', 'Romain', 'Eva', 'Kenji', 'Agathe', 'Diego', 'Juliette', 'Omar', 'Capucine', 'Simon']
const lastNames = ['Martin', 'Bernard', 'Durand', 'Petit', 'Moreau', 'Laurent', 'Girard', 'Roux', 'Fournier', 'Morel', 'Mercier', 'Blanc', 'Guerin', 'Faure', 'Chevalier', 'Benali', 'Nguyen', 'Diallo', 'Rossi', 'Garcia', 'Lemoine', 'Perrin', 'Bonnet', 'Haddad', 'Lambert', 'Fontaine', 'Rousseau', 'Vincent', 'Muller', 'Lefèvre']
const bios = [
  'Passionnée d’art et toujours partante pour découvrir de nouvelles techniques !',
  'J’aime créer à plusieurs, surtout en plein air.',
  'Musicien amateur, je cherche des gens avec qui jouer le week-end.',
  'Je dessine dans les transports et j’aimerais sortir de mon carnet.',
  'Ancienne prof d’arts plastiques, j’adore transmettre.',
  'Nouvelle à Lyon, je veux rencontrer des personnes créatives.',
  'Photographe du dimanche, fan de lumière rasante.',
  'Danseur hip-hop depuis dix ans, curieux de tout le reste.',
  'Je fais de la poterie pour me vider la tête après le travail.',
  'J’écris des poèmes depuis toujours, je me lance enfin à l’oral.',
  'Curieuse, j’essaie une nouvelle discipline chaque mois.',
  'Étudiant aux Beaux-Arts, j’organise des ateliers ouverts à tous.',
]

export function buildUsers(rand) {
  const users = []
  for (let i = 0; i < 120; i++) {
    const first = firstNames[i % firstNames.length]
    const last = lastNames[(i * 7 + Math.floor(i / firstNames.length)) % lastNames.length]
    const d = districts[Math.floor(rand() * districts.length)]
    const interests = []
    while (interests.length < 2 + Math.floor(rand() * 3)) {
      const id = catalog.disciplines[Math.floor(rand() * (catalog.disciplines.length - 1))].id
      if (!interests.includes(id)) interests.push(id)
    }
    users.push({
      uid: `demo-user-${String(i + 1).padStart(3, '0')}`,
      firstName: first,
      lastName: last,
      userType: i % 3 === 0 ? 'organisateur' : 'participant',
      bio: bios[Math.floor(rand() * bios.length)],
      interests,
      address: d.label,
      addressLat: +(d.lat + (rand() - 0.5) * 0.006).toFixed(5),
      addressLng: +(d.lng + (rand() - 0.5) * 0.008).toFixed(5),
      photoUrl: '',
      profileComplete: true,
      demo: true,
    })
  }
  return users
}

const titleIdeas = {
  peinture: ['Atelier peinture libre', 'Aquarelle au bord de l’eau', 'Peindre la lumière d’automne', 'Acrylique et musique douce', 'Initiation à la peinture à l’huile', 'Gouache et papier kraft', 'Peinture murale participative'],
  dessin: ['Croquis en plein air', 'Croquis modèle vivant', 'Balade urban sketching', 'Atelier BD : créer son personnage', 'Portraits croisés', 'Dessin d’observation au musée', 'Carnet de croquis du marché'],
  musique: ['Jam session acoustique', 'Cercle de percussions', 'Bœuf blues ouvert', 'Initiation à la guitare', 'Piano à quatre mains', 'Atelier MAO débutants', 'Scène ouverte acoustique'],
  chant: ['Chorale ouverte', 'Chants du monde à plusieurs voix', 'Atelier gospel', 'Initiation au beatbox', 'Chant improvisé en cercle', 'Échauffement vocal et harmonies'],
  danse: ['Cours de danse contemporaine', 'Salsa sur les quais', 'Hip-hop : bases et freestyle', 'Danses africaines au parc', 'Milonga d’initiation au tango', 'Impro dansée en musique live'],
  theatre: ['Initiation à l’improvisation', 'Lecture théâtralisée', 'Atelier clown', 'Mime et expression corporelle', 'Théâtre forum citoyen', 'Match d’impro amical'],
  photo: ['Sortie photo de rue', 'Portraits en lumière naturelle', 'Balade argentique', 'Photo de nuit sur les quais', 'Macro au jardin', 'Chasse aux reflets'],
  'street-art': ['Fresque collective dans le quartier', 'Atelier pochoir', 'Collage urbain autorisé', 'Initiation au lettrage', 'Graffiti sur toile'],
  artisanat: ['Initiation à la poterie', 'Céramique : bols et tasses', 'Atelier couture zéro déchet', 'Tricot-thé du dimanche', 'Créer ses bijoux en perles', 'Modelage d’argile'],
  ecriture: ['Atelier écriture et slam', 'Cercle de poésie', 'Écrire une nouvelle en deux heures', 'Écriture de chansons', 'Carnet de voyage illustré'],
  'arts-plastiques': ['Atelier collage créatif', 'Linogravure : premiers motifs', 'Sculpture en fil de fer', 'Art textile et broderie libre', 'Modelage pour tous'],
  autre: ['Ciné-débat court métrage', 'Origami géant', 'Calligraphie latine', 'Atelier art numérique', 'Tourner un clip au smartphone'],
}
const descriptionOpenings = [
  'Un moment convivial pour explorer ta créativité. Thème du jour : {sub}.',
  'On se retrouve pour une séance de pratique collective, au programme : {sub}.',
  'Envie de te lancer ? Cette séance propose une découverte accessible ({sub}).',
  'Une séance détendue pour progresser ensemble. Focus : {sub}.',
  'Rejoins un petit groupe de passionnés pour une session {sub}.',
]
const descriptionEndings = [
  'Aucun niveau requis, juste l’envie de créer !',
  'On termine par un temps d’échange autour d’une boisson chaude.',
  'Chacun avance à son rythme, dans la bonne humeur.',
  'Les débutants comme les habitués sont les bienvenus.',
  'Le groupe reste petit pour que chacun puisse être accompagné.',
]
const equipmentByDiscipline = {
  peinture: 'Tablier conseillé. Matériel de base fourni sur place.', dessin: 'Un carnet et un crayon.', musique: 'Ton instrument si tu en as un.', chant: 'Une bouteille d’eau.', danse: 'Tenue souple et bouteille d’eau.', theatre: 'Une tenue confortable.', photo: 'Appareil photo ou smartphone chargé.', 'street-art': 'Vêtements qui ne craignent rien.', artisanat: 'Tablier conseillé. Matière première fournie.', ecriture: 'Un carnet et un stylo.', 'arts-plastiques': 'Ciseaux et colle si tu en as.', autre: 'Rien de particulier.',
}
const venueTypesByDiscipline = {
  peinture: ['parc', 'atelier', 'cafe', 'berges'], dessin: ['place', 'parc', 'musee', 'cafe'], musique: ['salle', 'cafe', 'tiers-lieu', 'parc'], chant: ['mjc', 'salle', 'mediatheque'], danse: ['studio', 'mjc', 'berges', 'parc'], theatre: ['mjc', 'salle', 'tiers-lieu'], photo: ['place', 'berges', 'parc'], 'street-art': ['tiers-lieu', 'place', 'galerie'], artisanat: ['atelier', 'tiers-lieu'], ecriture: ['cafe', 'mediatheque', 'galerie'], 'arts-plastiques': ['atelier', 'mediatheque', 'galerie'], autre: ['tiers-lieu', 'mjc', 'mediatheque'],
}
const messageLines = [
  'Super, j’ai hâte !', 'Est-ce que quelqu’un sait s’il faut apporter son propre matériel ?', 'Parfait ! Je viendrai avec une amie si c’est possible.', 'On se retrouve directement sur place ?', 'Je serai peut-être 5 minutes en retard, désolé d’avance.', 'Merci pour l’organisation !', 'Quelqu’un vient depuis Villeurbanne ? On pourrait faire le trajet ensemble.', 'Il annonce un peu de vent, pensez à une veste.', 'C’est ma première fois, un peu stressée mais motivée !', 'Trop bien, ça va être top.', 'Je peux apporter des boissons chaudes.', 'Le point de rendez-vous est bien à l’entrée principale ?', 'J’ai partagé l’activité avec mon colocataire, il s’est inscrit.', 'Merci pour ce super moment, on remet ça quand ?', 'J’ai mis mes photos dans l’album, allez voir !', 'Hâte de voir ce qu’on va créer ensemble.', 'Est-ce qu’il reste de la place pour une personne de plus ?', 'Bonne idée le thème de cette fois !', 'Je confirme ma présence 👍',
]
const organizerLines = [
  'Bienvenue à toutes et à tous dans le groupe !', 'Rendez-vous 10 minutes avant le début pour s’installer.', 'Pas besoin d’apporter de matériel, tout est prévu.', 'En cas de pluie, on se replie à l’intérieur juste à côté.', 'Merci d’être venus aussi nombreux, c’était génial !', 'Petit rappel : pensez à prévenir si vous ne pouvez plus venir, la liste d’attente est longue.',
]

const normalizeText = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const venueHints = [
  [/quais|bord de l.eau|berges/, ['berges']],
  [/plein air|au parc|au jardin|macro/, ['parc']],
  [/au musee/, ['musee']],
  [/de rue|urban|balade|marche|ville|dans le quartier|collage urbain|lumiere naturelle/, ['place', 'berges']],
]
const pad = n => String(n).padStart(2, '0')
const isoDay = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function buildDataset(baseDate = new Date()) {
  const rand = prng(20261110)
  const venues = buildVenues(rand)
  const users = buildUsers(rand)
  const organizers = users.filter(u => u.userType === 'organisateur')
  const activities = []
  const messages = []
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  // Tirage séparé : ajouter les listes d'attente ne change pas le reste du jeu de données.
  const queueRand = prng(20261109)
  for (let i = 0; i < 220; i++) {
    const discipline = catalog.disciplines[i % catalog.disciplines.length]
    const titles = titleIdeas[discipline.id]
    const title = titles[Math.floor(i / catalog.disciplines.length) % titles.length]
    const randomSub = discipline.subs[Math.floor(rand() * discipline.subs.length)]
    // La sous-discipline et le type de lieu suivent le titre quand il les évoque.
    const t = normalizeText(title)
    const sub = discipline.subs.find(s => t.includes(normalizeText(s))) ?? discipline.subs.find(s => t.includes(normalizeText(s).split(' ')[0])) ?? randomSub
    const hinted = venueHints.find(([pattern]) => pattern.test(normalizeText(title)))?.[1]
    const types = hinted ?? venueTypesByDiscipline[discipline.id]
    const candidates = venues.filter(v => types.includes(v.type))
    const venue = candidates[Math.floor(rand() * candidates.length)]
    const organizer = organizers[Math.floor(rand() * organizers.length)]
    const dayOffset = Math.floor(rand() * 90) - 30
    const date = new Date(base)
    date.setDate(base.getDate() + dayOffset)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const startHour = weekend ? [10, 14, 15, 16][Math.floor(rand() * 4)] : [12, 18, 19, 20][Math.floor(rand() * 4)]
    const duration = 1 + Math.floor(rand() * 3)
    const capacity = [6, 8, 10, 12, 15, 20][Math.floor(rand() * 6)]
    const fillRatio = dayOffset < 0 ? 0.5 + rand() * 0.5 : rand()
    const target = Math.min(capacity, Math.max(1, Math.round(capacity * fillRatio)))
    const participantIds = []
    while (participantIds.length < target) {
      const u = users[Math.floor(rand() * users.length)]
      if (u.uid !== organizer.uid && !participantIds.includes(u.uid)) participantIds.push(u.uid)
    }
    const level = catalog.levels[Math.floor(rand() * catalog.levels.length)].id
    const id = `demo-act-${String(i + 1).padStart(3, '0')}`
    const opening = descriptionOpenings[Math.floor(rand() * descriptionOpenings.length)]
    const ending = descriptionEndings[Math.floor(rand() * descriptionEndings.length)]
    // Une activité est toujours publiée avant la date de référence.
    const createdAtMs = Math.min(date.getTime(), base.getTime()) - (5 + Math.floor(rand() * 20)) * 86400000
    const activity = {
      id,
      title,
      discipline: discipline.id,
      subDiscipline: sub,
      description: `${opening.replace('{sub}', sub.toLowerCase())} ${ending}`,
      level,
      equipment: equipmentByDiscipline[discipline.id],
      coverUrl: `/images/activities/${discipline.id}-${1 + (i % 2)}.svg`,
      placeName: venue.name,
      address: venue.address,
      district: venue.district,
      lat: venue.lat,
      lng: venue.lng,
      date: isoDay(date),
      startTime: `${pad(startHour)}:00`,
      endTime: `${pad(startHour + duration)}:${rand() < 0.3 ? '30' : '00'}`,
      capacity,
      participantIds,
      organizerId: organizer.uid,
      organizerName: `${organizer.firstName} ${organizer.lastName}`,
      organizerPhoto: '',
      status: 'published',
      createdAtMs,
      demo: true,
      lastMessage: null,
      waitlistIds: [],
      offer: null,
    }
    // Liste d'attente (sujet ART) : une partie des activités complètes à venir a 1 à 4 personnes en attente.
    // Quelques activités à venir très demandées affichent complet.
    if (dayOffset >= 0 && queueRand() < 0.15) {
      while (participantIds.length < capacity) {
        const u = users[Math.floor(queueRand() * users.length)]
        if (u.uid !== organizer.uid && !participantIds.includes(u.uid)) participantIds.push(u.uid)
      }
    }
    if (dayOffset >= 0 && participantIds.length === capacity && queueRand() < 0.7) {
      const size = 1 + Math.floor(queueRand() * 4)
      while (activity.waitlistIds.length < size) {
        const u = users[Math.floor(queueRand() * users.length)]
        if (u.uid !== organizer.uid && !participantIds.includes(u.uid) && !activity.waitlistIds.includes(u.uid)) activity.waitlistIds.push(u.uid)
      }
    }
    // Conversation de groupe : quelques messages d'organisateur et de participants.
    const count = 2 + Math.floor(rand() * 6)
    let at = createdAtMs + 3600000
    for (let m = 0; m < count; m++) {
      const fromOrganizer = m === 0 || rand() < 0.2
      const authorId = participantIds[Math.floor(rand() * participantIds.length)]
      const author = fromOrganizer ? organizer : users.find(u => u.uid === authorId)
      const text = fromOrganizer ? organizerLines[Math.floor(rand() * organizerLines.length)] : messageLines[Math.floor(rand() * messageLines.length)]
      at += Math.floor((1 + rand() * 30) * 3600000)
      if (at > base.getTime() + 9 * 3600000) break
      messages.push({ activityId: id, authorId: author.uid, authorName: author.firstName, authorPhoto: '', text, sentAtMs: at, demo: true })
      activity.lastMessage = { text, authorName: author.firstName, authorId: author.uid, sentAtMs: at }
    }
    activities.push(activity)
  }
  const privateChats = buildPrivateChats(activities, users, base)
  return { venues, users, activities, messages, privateChats }
}

// Messagerie privée : des participants posent une question à l'organisateur avant de s'inscrire.
const privateQuestions = [
  ['Bonjour ! Est-ce que l’atelier convient à quelqu’un qui débute complètement ?', 'Oui, bien sûr ! On commence par les bases, tu seras à l’aise.'],
  ['Salut, faut-il apporter son propre matériel ?', 'Non, tout est fourni sur place. Prends juste une tenue confortable.'],
  ['Bonjour, est-ce accessible en fauteuil roulant ?', 'Oui, le lieu est de plain-pied et l’entrée est accessible.'],
  ['Hello ! Je risque d’arriver avec 10 minutes de retard, c’est gênant ?', 'Pas de souci, on commence doucement. Préviens-moi juste par message.'],
  ['Bonjour, il y a un endroit pour garer un vélo ?', 'Oui, des arceaux juste devant l’entrée.'],
  ['Est-ce que je peux venir avec une amie qui n’est pas inscrite ?', 'Le nombre de places est limité, le mieux est qu’elle s’inscrive aussi (ou en liste d’attente).'],
]
function buildPrivateChats(activities, users, base) {
  const rand = prng(20261111)
  const upcoming = activities.filter(a => a.date >= isoDay(base))
  const chats = []
  for (let i = 0; i < 40 && upcoming.length; i++) {
    const activity = upcoming[Math.floor(rand() * upcoming.length)]
    const asker = users[Math.floor(rand() * users.length)]
    if (asker.uid === activity.organizerId) continue
    const memberIds = [asker.uid, activity.organizerId].sort()
    const id = memberIds.join('__')
    if (chats.some(c => c.id === id)) continue
    const [question, answer] = privateQuestions[Math.floor(rand() * privateQuestions.length)]
    const askedAt = base.getTime() - Math.floor(rand() * 72) * 3600000
    const answeredAt = askedAt + (10 + Math.floor(rand() * 240)) * 60000
    const messages = [{ authorId: asker.uid, text: question, sentAtMs: askedAt, demo: true }]
    if (rand() < 0.8) messages.push({ authorId: activity.organizerId, text: answer, sentAtMs: answeredAt, demo: true })
    const last = messages[messages.length - 1]
    chats.push({
      id, memberIds, activityId: activity.id, activityTitle: activity.title,
      lastMessage: { text: last.text, authorId: last.authorId, sentAtMs: last.sentAtMs },
      readAtMs: { [asker.uid]: askedAt, [activity.organizerId]: messages.length > 1 ? answeredAt : 0 },
      updatedAtMs: last.sentAtMs, demo: true, messages,
    })
  }
  return chats
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dateArg = process.argv.slice(2).find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg))
  const data = buildDataset(dateArg ? new Date(`${dateArg}T12:00:00`) : new Date())
  // --stdout : utilisé par les tests Playwright, qui ne chargent pas de module ESM.
  if (process.argv.includes('--stdout')) process.stdout.write(JSON.stringify(data))
  else writeFiles(data)
}

function writeFiles(data) {
  const out = resolve(root, 'specs/data')
  mkdirSync(out, { recursive: true })
  for (const [name, rows] of Object.entries(data)) writeFileSync(resolve(out, `${name}.json`), JSON.stringify(rows, null, 1) + '\n')
  // Les lieux suggérés à l'organisateur sont embarqués dans l'application.
  writeFileSync(resolve(root, 'frontend/src/data/venues.json'), JSON.stringify(data.venues.map(({ id, name, type, district, address, lat, lng }) => ({ id, name, type, district, address, lat, lng }))) + '\n')
  const reservations = data.activities.reduce((n, a) => n + a.participantIds.length, 0)
  const waiting = data.activities.reduce((n, a) => n + (a.waitlistIds?.length ?? 0), 0)
  console.log(`${data.users.length} membres, ${data.activities.length} activités, ${reservations} participations, ${waiting} en liste d’attente, ${data.messages.length} messages, ${data.privateChats.length} conversations privées, ${data.venues.length} lieux → specs/data/`)
}
