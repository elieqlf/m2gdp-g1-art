import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import AddressInput from '../src/components/AddressInput.vue'
import * as places from '../src/services/places'
vi.mock('../src/services/places', () => ({ suggestAddresses: vi.fn(), resolveAddress: vi.fn() }))
let wrapper: VueWrapper
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers() })
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
it('attend la fin de la frappe et permet le choix au clavier', async () => {
  const prediction = { placeId: 'paris', text: { text: 'Paris, France' } }
  vi.mocked(places.suggestAddresses).mockResolvedValue([prediction])
  vi.mocked(places.resolveAddress).mockResolvedValue({ address: 'Paris, France', lat: 48.85, lng: 2.35 })
  wrapper = mount(AddressInput, { props: { modelValue: '', 'onUpdate:modelValue': (value: string) => { void wrapper.setProps({ modelValue: value }) } } })
  await wrapper.get('input').setValue('Par')
  await vi.advanceTimersByTimeAsync(200)
  await wrapper.get('input').setValue('Paris')
  expect(places.suggestAddresses).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(300); await flushPromises()
  expect(places.suggestAddresses).toHaveBeenCalledTimes(1)
  await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' })
  await wrapper.get('input').trigger('keydown', { key: 'Enter' })
  await flushPromises()
  expect(wrapper.emitted('select')?.at(-1)).toEqual([{ address: 'Paris, France', lat: 48.85, lng: 2.35 }])
})
it('ignore les réponses anciennes après effacement de l’adresse', async () => {
  let resolve!: (value: places.Prediction[]) => void
  vi.mocked(places.suggestAddresses).mockReturnValue(new Promise(done => { resolve = done }))
  wrapper = mount(AddressInput, { props: { modelValue: '', 'onUpdate:modelValue': (value: string) => { void wrapper.setProps({ modelValue: value }) } } })
  await wrapper.get('input').setValue('Paris')
  await vi.advanceTimersByTimeAsync(300)
  await wrapper.get('input').setValue('')
  resolve([{ placeId: 'paris', text: { text: 'Paris, France' } }])
  await flushPromises()
  expect(wrapper.find('[role="option"]').exists()).toBe(false)
})
it('conserve la saisie manuelle lorsque Google Places échoue', async () => {
  vi.mocked(places.suggestAddresses).mockRejectedValue(new Error('offline'))
  wrapper = mount(AddressInput, { props: { modelValue: '', 'onUpdate:modelValue': (value: string) => { void wrapper.setProps({ modelValue: value }) } } })
  await wrapper.get('input').setValue('Paris')
  await vi.advanceTimersByTimeAsync(300); await flushPromises()
  expect(wrapper.text()).toContain('saisir votre adresse manuellement')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Paris'])
})
