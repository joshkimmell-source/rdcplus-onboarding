// Session tracking for user testing. Events are submitted to a Google Form that has no sign-in
// requirement; a script on the Form's response Sheet turns each submission into event rows
// (see tracking/README.md). Nothing is sent unless the Form is configured at build time, and
// `?notrack` turns it off for a session. Typed text (invite form, chat) is never recorded.

// The Form's response address (…/formResponse) and the id of its one long-answer field (entry.123…).
const FORM_URL = import.meta.env.VITE_TRACKING_FORM_URL as string | undefined
const FORM_ENTRY = import.meta.env.VITE_TRACKING_FORM_ENTRY as string | undefined
// Submissions without this token are ignored by the Sheet script. It ships in the bundle, so it
// only keeps stray traffic out.
const TOKEN = (import.meta.env.VITE_TRACKING_TOKEN as string | undefined) ?? ''

// `?pid=` (a label for the participant, e.g. ?pid=ut-07 on the Start URL) and `?notrack` are kept
// in sessionStorage, because the URL is replaced when a tour starts or finishes.
const params = new URLSearchParams(window.location.search)
function remembered(key: string, fromUrl: string | null) {
  try {
    if (fromUrl !== null) sessionStorage.setItem(`rdcplus-wt:${key}`, fromUrl)
    return fromUrl ?? sessionStorage.getItem(`rdcplus-wt:${key}`) ?? ''
  } catch {
    return fromUrl ?? ''
  }
}
const pid = remembered('pid', params.get('pid'))
const enabled = !!FORM_URL && !!FORM_ENTRY && !(params.has('notrack') || remembered('notrack', params.has('notrack') ? '1' : null) === '1')

const SID_KEY = 'rdcplus-wt:sid'
function sessionId() {
  try {
    const existing = sessionStorage.getItem(SID_KEY)
    if (existing) return existing
    const made = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
    sessionStorage.setItem(SID_KEY, made)
    return made
  } catch {
    return Math.random().toString(36).slice(2, 10)
  }
}
const sid = sessionId()

export type Layout = 'desktop' | 'mobile'
let layout: Layout = 'desktop'
let seq = 0
let queue: Record<string, unknown>[] = []
let timer: number | undefined

export function setLayout(next: Layout) { layout = next }

function send(events: Record<string, unknown>[], beacon: boolean) {
  const body = new URLSearchParams({ [FORM_ENTRY!]: JSON.stringify({ token: TOKEN, events }) }).toString()
  // A plain form post is a "simple" request, so no CORS preflight; the response is opaque and ignored.
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(FORM_URL!, new Blob([body], { type: 'application/x-www-form-urlencoded' }))
    return
  }
  fetch(FORM_URL!, {
    method: 'POST', mode: 'no-cors', keepalive: true,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  }).catch(() => {})
}

export function flush(beacon = false) {
  window.clearTimeout(timer)
  timer = undefined
  if (!enabled || !queue.length) return
  const batch = queue
  queue = []
  send(batch, beacon)
}

export function track(name: string, props: Record<string, unknown> = {}) {
  const event = {
    t: new Date().toISOString(), sid, pid, seq: ++seq, name, layout,
    vw: window.innerWidth, vh: window.innerHeight, ...props,
  }
  if (import.meta.env.DEV) console.debug('[track]', name, props)
  if (!enabled) return
  queue.push(event)
  if (queue.length >= 10) flush()
  else if (timer === undefined) timer = window.setTimeout(() => flush(), 5000)
}

// Events that should be logged once per page load, however many times a component mounts.
const once = new Set<string>()
export function trackOnce(name: string, props: Record<string, unknown> = {}) {
  if (once.has(name)) return
  once.add(name)
  track(name, props)
}

window.addEventListener('pagehide', () => flush(true))
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true) })

// Completion URLs for UserTesting. A tour's last step (Done) loads `<page>?done=<tour>`, a real page
// navigation, which is what UserTesting's "Validation by URL" can see (an in-page hash change was
// not detected). The session is kept in sessionStorage, so the page picks up where it left off.
// The URL carries only that one parameter, so it matches an Exact condition as well as Contains.
// Starting or ending a tour early only rewrites the URL (no navigation): `?start=` / `?exit=`.
const pageUrl = () => window.location.origin + window.location.pathname

export function doneUrl(tourId: string) {
  return `${pageUrl()}?done=${encodeURIComponent(tourId)}`
}

export function markTour(kind: 'start' | 'exit', tourId: string) {
  window.history.replaceState(null, '', `${pageUrl()}?${kind}=${encodeURIComponent(tourId)}`)
}
