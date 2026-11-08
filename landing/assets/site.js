// NOVART — site vitrine : menu mobile, apparition au défilement, formulaire de contact.
document.documentElement.classList.remove('no-js')

const toggle = document.querySelector('.nav-toggle')
const nav = document.getElementById('site-nav')
if (toggle && nav) {
  const setOpen = open => {
    nav.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu')
    toggle.querySelector('use')?.setAttribute('href', open ? '#i-x' : '#i-menu')
  }
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')))
  nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false) })
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false) })
}

const items = document.querySelectorAll('.reveal')
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
  }), { threshold: 0.12 })
  items.forEach(item => observer.observe(item))
} else items.forEach(item => item.classList.add('is-visible'))

document.querySelectorAll('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()) })

// Formulaire de contact : vérifications dans le navigateur. Le site n'a pas encore
// de service d'envoi : le message de confirmation le dit clairement.
const form = document.getElementById('contact-form')
if (form) {
  const success = document.getElementById('contact-success')
  const fields = {
    name: [v => v.trim().length >= 2, 'Indique ton prénom.'],
    email: [v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'Saisis une adresse e-mail valide.'],
    message: [v => v.trim().length >= 10, 'Écris un message d’au moins 10 caractères.'],
  }
  const showError = (input, text) => {
    const error = document.getElementById(`${input.id}-error`)
    input.setAttribute('aria-invalid', text ? 'true' : 'false')
    if (error) error.textContent = text
  }
  form.addEventListener('submit', event => {
    event.preventDefault()
    let first = null
    for (const [name, [valid, text]] of Object.entries(fields)) {
      const input = form.elements.namedItem(name)
      const ok = valid(input.value)
      showError(input, ok ? '' : text)
      if (!ok && !first) first = input
    }
    const consent = form.elements.namedItem('consent')
    const consentError = document.getElementById('consent-error')
    if (!consent.checked) { consentError.textContent = 'Merci d’accepter l’utilisation de tes données pour te répondre.'; first ||= consent }
    else consentError.textContent = ''
    if (first) { first.focus(); return }
    form.hidden = true
    success.classList.add('is-visible')
    success.querySelector('[data-name]').textContent = form.elements.namedItem('name').value.trim()
    success.focus()
  })
}
