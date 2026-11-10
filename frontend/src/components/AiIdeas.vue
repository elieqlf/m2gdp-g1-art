<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronDown, LoaderCircle, Sparkles, WandSparkles } from '@lucide/vue'
import DisciplineBadge from '@/components/DisciplineBadge.vue'
import { disciplineLabel, levelLabel } from '@/lib/activity'
import { idToken } from '@/services/firebase'
import { activityIdeas, AiError, type ActivityIdea } from '@/services/ai'

// Idées d'activités culturelles proposées par l'IA (Mistral Small via le Worker) à partir de mots-clés,
// au niveau du choix de la discipline : l'organisateur relit puis choisit une idée,
// qui remplit le titre, la description, la pratique, le niveau et le matériel.
const props = defineProps<{ discipline: string }>()
const emit = defineEmits<{ use: [idea: ActivityIdea] }>()
const open = ref(false)
const keywords = ref('')
const busy = ref(false)
const error = ref('')
const ideas = ref<ActivityIdea[]>([])
const used = ref(-1)
const scope = computed(() => props.discipline ? `en ${disciplineLabel(props.discipline).toLowerCase()}` : 'toutes disciplines')
const ERRORS: Record<string, string> = {
  'invalid-keywords': 'Écris au moins un mot-clé (2 lettres minimum).',
  unauthenticated: 'Ta session a expiré. Reconnecte-toi puis réessaie.',
  'not-configured': 'Les idées par IA ne sont pas encore activées sur ce serveur.',
  network: 'Pas de connexion : vérifie ton réseau et réessaie.',
  'ai-failed': 'L’IA n’a pas pu proposer d’idées cette fois-ci. Réessaie ou change de mots-clés.',
  'daily-limit': 'Le quota gratuit d’idées du jour est atteint pour NOVART. Réessaie demain.',
}

async function generate() {
  error.value = ''
  if (keywords.value.trim().length < 2) { error.value = ERRORS['invalid-keywords']!; return }
  busy.value = true
  used.value = -1
  try {
    ideas.value = await activityIdeas({ keywords: keywords.value, discipline: props.discipline }, await idToken())
  } catch (cause) {
    const code = cause instanceof AiError ? cause.code : ''
    error.value = code === 'too-many-requests'
      ? `Tu as demandé beaucoup d’idées d’affilée. Réessaie dans ${Math.max(1, Math.ceil((cause as AiError).retryAfter / 60))} min.`
      : ERRORS[code] ?? 'Les idées ne sont pas disponibles pour le moment. Réessaie dans un instant.'
  } finally { busy.value = false }
}
function use(idea: ActivityIdea, index: number) { used.value = index; emit('use', idea) }
</script>

<template>
  <section class="ai-ideas" :class="{ 'is-open': open }" aria-labelledby="ai-ideas-title">
    <button type="button" class="ai-ideas__toggle" :aria-expanded="open" aria-controls="ai-ideas-panel" @click="open = !open">
      <Sparkles aria-hidden="true" />
      <span><strong id="ai-ideas-title">Trouver une idée avec l’IA</strong><small>Quelques mots-clés suffisent, {{ scope }}</small></span>
      <ChevronDown class="ai-ideas__chevron" aria-hidden="true" />
    </button>
    <div v-show="open" id="ai-ideas-panel" class="ai-ideas__panel">
      <form class="ai-ideas__form" @submit.prevent="generate">
        <label for="ai-keywords" class="sr-only">Mots-clés pour l’IA</label>
        <input id="ai-keywords" v-model="keywords" class="text-field" maxlength="120" placeholder="Ex. : aquarelle, quais du Rhône, débutants" autocomplete="off" />
        <button type="submit" class="btn btn--primary" :disabled="busy" :aria-busy="busy">
          <LoaderCircle v-if="busy" class="spin" aria-hidden="true" /><WandSparkles v-else aria-hidden="true" />{{ busy ? 'Recherche d’idées…' : ideas.length ? 'Autres idées' : 'Proposer des idées' }}
        </button>
      </form>
      <p v-if="error" class="form-alert" role="alert">{{ error }}</p>
      <ul v-if="ideas.length" class="ai-ideas__list" aria-label="Idées proposées par l’IA">
        <li v-for="(idea, index) in ideas" :key="`${idea.title}-${index}`" class="ai-idea" :class="{ 'is-used': used === index }">
          <div class="ai-idea__head"><strong>{{ idea.title }}</strong><DisciplineBadge :discipline="idea.discipline" /></div>
          <p>{{ idea.description }}</p>
          <p class="ai-idea__meta">{{ levelLabel(idea.level) }}<template v-if="idea.subDiscipline"> · {{ idea.subDiscipline }}</template> · environ {{ idea.durationHours }} h<template v-if="idea.equipment"> · {{ idea.equipment }}</template></p>
          <button type="button" class="btn btn--soft btn--small" @click="use(idea, index)"><Check v-if="used === index" aria-hidden="true" />{{ used === index ? 'Idée reprise dans le formulaire' : 'Utiliser cette idée' }}</button>
        </li>
      </ul>
      <p class="ai-ideas__note">Idées générées par Mistral Small (IA hébergée par Cloudflare) : relis et adapte-les avant de publier. Tes mots-clés ne sont pas conservés.</p>
    </div>
  </section>
</template>
