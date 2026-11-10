import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

vi.mock('../src/services/firebase', () => ({ listMembers: vi.fn(async () => []), setFavorite: vi.fn() }))
vi.mock('../src/services/activities', () => ({ listActivities: vi.fn(async () => []), getActivity: vi.fn(), watchMyOffers: vi.fn(() => () => {}), watchMyActivities: vi.fn(() => () => {}) }))
vi.mock('../src/services/messages', () => ({
  chatIdFor: (a: string, b: string) => [a, b].sort().join('__'),
  isUnread: () => false,
  otherMember: (chat: { memberIds: string[] }, uid: string) => chat.memberIds.find(id => id !== uid) ?? uid,
  markChatRead: vi.fn(async () => {}),
  sendPrivateMessage: vi.fn(async (from: string, to: string) => [from, to].sort().join('__')),
  watchPrivateMessages: vi.fn(),
  watchMyChats: vi.fn(() => () => {}),
}))
import PrivateChatView from '../src/views/PrivateChatView.vue'
import * as messages from '../src/services/messages'
import { store } from '../src/lib/store'

// Premier message à un membre : la conversation n'est lisible qu'une fois enregistrée par le serveur.
type Listener = { next: (data: messages.PrivateMessage[]) => void; fail: (e: Error) => void }
let listeners: Listener[]
let wrapper: VueWrapper
const CHAT = 'demo-user-042__me'
const chat = (pending: boolean) => ({ id: CHAT, memberIds: ['demo-user-042', 'me'] as [string, string], lastMessage: { text: 'Salut', authorId: 'me', sentAtMs: 1 }, readAtMs: {}, updatedAtMs: 1, pending })

beforeEach(() => {
  vi.useFakeTimers()
  Element.prototype.scrollIntoView = vi.fn() // absent de jsdom
  listeners = []
  vi.mocked(messages.watchPrivateMessages).mockImplementation((_id, next, fail) => { listeners.push({ next, fail }); return vi.fn() })
  store.account = { uid: 'me', email: null } as never
  store.members = { 'demo-user-042': { uid: 'demo-user-042', firstName: 'Samuel', lastName: 'Roux' } }
  store.chats = []
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
const open = async () => { wrapper = mount(PrivateChatView, { props: { id: 'demo-user-042' } }); await flushPromises() }

describe('conversation privée', () => {
  it('attend que le serveur ait enregistré la conversation avant d’écouter ses messages', async () => {
    await open()
    store.chats = [chat(true)]
    await flushPromises()
    expect(messages.watchPrivateMessages).not.toHaveBeenCalled()
    store.chats = [chat(false)]
    await flushPromises()
    expect(messages.watchPrivateMessages).toHaveBeenCalledWith(CHAT, expect.any(Function), expect.any(Function))
  })
  it('réessaie si la lecture est refusée, sans afficher d’erreur', async () => {
    store.chats = [chat(false)]
    await open()
    listeners[0]!.fail(new Error('permission-denied'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Messages indisponibles')
    vi.advanceTimersByTime(800)
    await flushPromises()
    expect(listeners).toHaveLength(2)
    listeners[1]!.next([{ id: 'm1', authorId: 'me', text: 'Bonjour Samuel', sentAtMs: Date.now() }])
    await flushPromises()
    expect(wrapper.text()).toContain('Bonjour Samuel')
  })
  it('affiche une erreur seulement après plusieurs refus', async () => {
    store.chats = [chat(false)]
    await open()
    for (const delay of [800, 2000, 5000]) { listeners.at(-1)!.fail(new Error('permission-denied')); await flushPromises(); vi.advanceTimersByTime(delay); await flushPromises() }
    listeners.at(-1)!.fail(new Error('permission-denied'))
    await flushPromises()
    expect(wrapper.text()).toContain('Messages indisponibles pour le moment.')
  })
  it('relance l’écoute après l’envoi du premier message', async () => {
    await open()
    await wrapper.get('#private-message').setValue('Bonjour Samuel')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(messages.sendPrivateMessage).toHaveBeenCalledWith('me', 'demo-user-042', 'Bonjour Samuel', undefined)
    expect(messages.watchPrivateMessages).toHaveBeenCalledWith(CHAT, expect.any(Function), expect.any(Function))
  })
})
