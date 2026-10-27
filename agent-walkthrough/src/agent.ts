// The agent the prototype is "signed in" as. Participants enter their first name on the way in,
// and it becomes "<First> Agent" everywhere the agent's name or initials appear (so Josh becomes
// "Josh Agent", JA). The name lives in the browser tab. When tracking is on, telemetry attaches it
// to each event as `firstName` (see enteredFirstName) so results can be matched to a participant.

const KEY = 'rdcplus-onboarding:firstName'

export const AGENT = { firstName: 'Georgia', name: 'Georgia Booth', initials: 'GB', brokerage: 'Brightwater Realty Group' }

// The first name the participant typed, or '' before they have (AGENT.firstName is a default until then).
let entered = ''
export const enteredFirstName = () => entered

export function cleanFirstName(raw: string) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 24)
}

export function setAgentFirstName(raw: string) {
  const first = cleanFirstName(raw)
  if (!first) return false
  AGENT.firstName = first
  entered = first
  AGENT.name = `${first} Agent`
  AGENT.initials = `${first[0].toUpperCase()}A`
  try { sessionStorage.setItem(KEY, first) } catch { /* private mode: the name just won't survive a refresh */ }
  return true
}

// A refresh in the same tab keeps the name, so the participant isn't asked twice.
export function hasAgentFirstName() {
  try {
    const stored = sessionStorage.getItem(KEY)
    return !!stored && setAgentFirstName(stored)
  } catch {
    return false
  }
}

// The welcome dialog is for a new session only. A soft reload in the same tab keeps the name and
// skips it; a new tab (a new participant) starts over.
const WELCOME_KEY = 'rdcplus-onboarding:welcomeSeen'

export function welcomeSeen() {
  try { return sessionStorage.getItem(WELCOME_KEY) === '1' } catch { return false }
}

export function markWelcomeSeen() {
  try { sessionStorage.setItem(WELCOME_KEY, '1') } catch { /* ignore */ }
}

export function forgetWelcomeSeen() {
  try { sessionStorage.removeItem(WELCOME_KEY) } catch { /* ignore */ }
}

hasAgentFirstName()
