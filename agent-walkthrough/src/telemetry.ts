// Session tracking for user testing. Events go to a Google Sheet through an Apps Script web app
// (see tracking/README.md). Nothing is sent unless VITE_TRACKING_URL is set at build time, and
// `?notrack` turns it off for a session. Typed text (invite form, chat) is never recorded.

const URL = import.meta.env.VITE_TRACKING_URL as string | undefined
const TOKEN = (import.meta.env.VITE_TRACKING_TOKEN as string | undefined) ?? ''

const params = new URLSearchParams(window.location.search)
const enabled = !!URL && !params.has('notrack')
// Optional label for the participant, e.g. ?pid=ut-07 on the Start URL.
const pid = params.get('pid') ?? ''

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
  const body = JSON.stringify({ token: TOKEN, events })
  // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight.
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(URL!, new Blob([body], { type: 'text/plain' }))
    return
  }
  fetch(URL!, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body }).catch(() => {})
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

// Completion URLs for UserTesting: the app sets the URL hash as a tour starts, finishes, or is
// ended early. `…/agent-walkthrough/#done-schedule` is the Completion URL for that activity.
export function setTourHash(kind: 'start' | 'done' | 'exit', tourId: string) {
  window.location.hash = `${kind}-${tourId}`
}
