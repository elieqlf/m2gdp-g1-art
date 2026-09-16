import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import App from '../src/App.vue'
import AddressInput from '../src/components/AddressInput.vue'
import * as api from '../src/services/firebase'

vi.mock('../src/services/firebase', () => ({
  isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
  hasSignInLink: vi.fn(() => false), pendingEmail: vi.fn(() => ''),
  requestSignInLink: vi.fn(), completeSignIn: vi.fn(), observeAccount: vi.fn(),
  getProfile: vi.fn(), saveProfile: vi.fn(), listMembers: vi.fn(), logout: vi.fn(),
}))
vi.mock('../src/services/places', () => ({ suggestAddresses: vi.fn(async () => []), resolveAddress: vi.fn() }))
let wrapper: VueWrapper
let observer: (user: api.Account | null) => void
const user = { uid: 'test-user', email: 'test@example.com' }
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.hasSignInLink).mockReturnValue(false)
  vi.mocked(api.pendingEmail).mockReturnValue('')
  vi.mocked(api.observeAccount).mockImplementation(callback => { observer = callback; callback(null); return vi.fn() })
  vi.mocked(api.getProfile).mockResolvedValue({ profileComplete: false })
  vi.mocked(api.listMembers).mockResolvedValue([])
  vi.mocked(api.requestSignInLink).mockResolvedValue(undefined)
  vi.mocked(api.saveProfile).mockResolvedValue(undefined)
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
async function render() { wrapper = mount(App); await flushPromises() }
async function openProfile() { await render(); observer(user); await flushPromises() }
async function fillProfile() {
  await wrapper.get('#firstName').setValue('Camille')
  await wrapper.get('#lastName').setValue('Martin')
  await wrapper.get('#address').setValue('Paris')
}
describe('Parcours inscription Shadcn-Vue', () => {
  it('bloque un e-mail invalide sans appeler Firebase', async () => {
    await render()
    await wrapper.get('#email').setValue('incorrect')
    await wrapper.get('form').trigger('submit')
    expect(api.requestSignInLink).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('e-mail valide')
  })
  it('confirme l’envoi et empêche les renvois immédiats', async () => {
    await render()
    await wrapper.get('#email').setValue('test@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.requestSignInLink).toHaveBeenCalledWith('test@example.com')
    expect(wrapper.text()).toContain('Consultez votre boîte mail')
    expect(wrapper.findAll('button').find(b => b.text().includes('Renvoyer'))?.attributes('disabled')).toBeDefined()
  })
  it('permet de réessayer après un échec réseau', async () => {
    vi.mocked(api.requestSignInLink).mockRejectedValueOnce(new Error('offline'))
    await render()
    await wrapper.get('#email').setValue('test@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Envoi impossible')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Consultez votre boîte mail')
  })
  it('demande l’e-mail sur un autre appareil et gère un lien expiré', async () => {
    vi.mocked(api.hasSignInLink).mockReturnValue(true)
    vi.mocked(api.completeSignIn).mockRejectedValueOnce({ code: 'auth/expired-action-code' })
    await render()
    expect(wrapper.text()).toContain('Confirmez votre e-mail')
    await wrapper.get('#confirm-email').setValue('test@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Ce lien n’est plus valide')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
  it('reprend un profil incomplet après reconnexion', async () => {
    vi.mocked(api.getProfile).mockResolvedValue({ profileComplete: false, firstName: 'Camille' })
    await openProfile()
    expect((wrapper.get('#firstName').element as HTMLInputElement).value).toBe('Camille')
    expect(wrapper.text()).toContain('Terminer mon inscription')
  })
  it('conserve les coordonnées choisies et affiche ensuite les membres', async () => {
    await openProfile(); await fillProfile()
    wrapper.getComponent(AddressInput).vm.$emit('select', { address: 'Paris', lat: 48.85, lng: 2.35 })
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(api.saveProfile).toHaveBeenCalledWith('test-user', expect.objectContaining({ firstName: 'Camille', addressLat: 48.85, addressLng: 2.35 }))
    expect(wrapper.text()).toContain('Utilisateurs inscrits')
  })
  it('retire les anciennes coordonnées après une saisie manuelle', async () => {
    await openProfile(); await fillProfile()
    wrapper.getComponent(AddressInput).vm.$emit('select', { address: 'Paris', lat: 48.85, lng: 2.35 })
    await wrapper.get('#address').setValue('Lyon')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(api.saveProfile).toHaveBeenCalledWith('test-user', expect.objectContaining({ address: 'Lyon', addressLat: null, addressLng: null }))
  })
  it('conserve le formulaire si l’enregistrement échoue', async () => {
    vi.mocked(api.saveProfile).mockRejectedValueOnce(new Error('offline'))
    await openProfile(); await fillProfile()
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(wrapper.text()).toContain('Vos informations sont conservées')
    expect((wrapper.get('#firstName').element as HTMLInputElement).value).toBe('Camille')
  })
  it('affiche un utilisateur existant et permet la déconnexion', async () => {
    vi.mocked(api.getProfile).mockResolvedValue({ profileComplete: true })
    vi.mocked(api.listMembers).mockResolvedValue([{ uid: 'other', firstName: 'Alex', lastName: 'Durand', userType: 'organisateur' }])
    vi.mocked(api.logout).mockImplementation(async () => { observer(null) })
    await render(); observer(user); await flushPromises()
    expect(wrapper.text()).toContain('Alex Durand')
    const button = wrapper.findAll('button').find(item => item.text() === 'Se déconnecter')!
    await button.trigger('click'); await flushPromises()
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Alex Durand')
  })
})
