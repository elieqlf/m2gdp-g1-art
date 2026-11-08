// Génère les illustrations de couverture par discipline (2 variantes chacune)
// dans frontend/public/images/activities/. Compositions originales aux couleurs
// de la charte NOVART, construites avec les pictogrammes Lucide (licence ISC)
// déjà utilisés par l'application.
// Usage : node scripts/design/generate-covers.mjs (après npm ci --prefix frontend)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const source = readFileSync(resolve(root, 'frontend/node_modules/@lucide/vue/dist/cjs/lucide-vue.js'), 'utf8')

function icon(name) {
  const start = source.indexOf(`name: "${name}",`)
  if (start < 0) throw new Error(`Pictogramme introuvable : ${name}`)
  const objectStart = source.lastIndexOf('{', start)
  const end = source.indexOf('\n};', start)
  return Function(`return ${source.slice(objectStart, end + 2)}`)().node
}

const RED = '#C03C3A', DEEP = '#781C27', CREAM = '#FFFEF1', ROSE = '#FFFBFB', GREY = '#545454'
const motifs = {
  peinture: ['palette', 'paintbrush'], dessin: ['pencil', 'pen-tool'], musique: ['music', 'guitar'], chant: ['mic-vocal', 'music-2'],
  danse: ['person-standing', 'footprints'], theatre: ['drama', 'venetian-mask'], photo: ['camera', 'aperture'], 'street-art': ['spray-can', 'brick-wall'],
  artisanat: ['amphora', 'scissors'], ecriture: ['feather', 'pen-line'], 'arts-plastiques': ['shapes', 'scissors'], autre: ['clapperboard', 'sparkles'],
}

function draw(nodes, { x, y, size, color, width, rotate = 0, opacity = 1 }) {
  const scale = size / 24
  const children = nodes.map(([tag, attrs]) => {
    const parts = Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v === 'currentColor' ? color : v}"`)
    return `<${tag} ${parts.join(' ')}/>`
  }).join('')
  return `<g transform="translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2}) scale(${scale})" fill="none" stroke="${color}" stroke-width="${width / scale}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">${children}</g>`
}

// Les trois traits « éclat » rappellent ceux du logo, sans le reproduire.
const burst = (x, y, color) => `<g stroke="${color}" stroke-width="9" stroke-linecap="round"><path d="M${x} ${y}l26-16"/><path d="M${x + 8} ${y + 26}l34-4"/><path d="M${x + 2} ${y + 54}l26 12"/></g>`
const dots = (x0, y0, color, opacity) => {
  let out = ''
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) out += `<circle cx="${x0 + i * 22}" cy="${y0 + j * 22}" r="3.2"/>`
  return `<g fill="${color}" opacity="${opacity}">${out}</g>`
}

function cover(discipline, variant) {
  const [main, second] = motifs[discipline].map(icon)
  const red = variant === 1
  const bg = red
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${RED}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/>`
    : `<rect width="800" height="500" fill="${CREAM}"/>`
  const shapes = red
    ? `<circle cx="560" cy="250" r="190" fill="${ROSE}" opacity=".12"/><circle cx="110" cy="430" r="140" fill="${DEEP}" opacity=".55"/>${dots(70, 60, ROSE, 0.35)}`
    : `<path d="M420 40c140-30 330 20 350 160s-80 260-250 270-300-60-300-200 60-200 200-230Z" fill="${RED}" opacity=".12"/><circle cx="120" cy="420" r="120" fill="${DEEP}" opacity=".9"/>${dots(640, 360, RED, 0.35)}`
  const mainColor = red ? CREAM : RED
  const secondColor = red ? ROSE : CREAM
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Illustration ${discipline}">${bg}${shapes}` +
    draw(main, { x: 400, y: 90, size: 320, color: mainColor, width: 14 }) +
    draw(second, { x: 55, y: 300, size: 130, color: secondColor, width: 10, rotate: -14, opacity: 0.95 }) +
    burst(330, 110, red ? ROSE : RED) +
    `<rect x="0" y="0" width="800" height="500" fill="none" stroke="${red ? DEEP : GREY}" stroke-opacity=".08" stroke-width="2"/></svg>\n`
}

const out = resolve(root, 'frontend/public/images/activities')
mkdirSync(out, { recursive: true })
let count = 0
for (const discipline of Object.keys(motifs)) for (const variant of [1, 2]) { writeFileSync(resolve(out, `${discipline}-${variant}.svg`), cover(discipline, variant)); count++ }
console.log(`${count} illustrations écrites dans frontend/public/images/activities/`)
