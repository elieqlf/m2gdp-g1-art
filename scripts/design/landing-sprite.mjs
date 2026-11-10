// Sprite des pictogrammes Lucide du site vitrine. Usage, à la racine du dépôt : node scripts/design/landing-sprite.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const src = readFileSync('frontend/node_modules/@lucide/vue/dist/cjs/lucide-vue.js', 'utf8')
const node = name => { const s = src.indexOf(`name: "${name}",`); if (s < 0) throw new Error(name); const o = src.lastIndexOf('{', s); const e = src.indexOf('\n};', s); return Function(`return ${src.slice(o, e + 2)}`)().node }
const names = ['menu','x','arrow-right','check','map-pin','users','message-circle-more','calendar-days','heart','shield-check','search','sliders-horizontal','sparkles','mail','smartphone','palette','music','drama','person-standing','camera','circle-plus','bell','map','clock','play','user','house','building','lock','gift','send','star','pencil','mic','spray-can','scissors','pen-line','shapes','ellipsis','chevron-down','log-in']
const sym = names.map(n => `<symbol id="i-${n}" viewBox="0 0 24 24">${node(n).map(([t, a]) => `<${t} ${Object.entries(a).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v === 'currentColor' ? 'currentColor' : v}"`).join(' ')}/>`).join('')}</symbol>`).join('')
writeFileSync(new URL('./landing-sprite.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true"><!-- Pictogrammes Lucide (licence ISC) -->${sym}</svg>`)
console.log(names.length, 'pictogrammes')
