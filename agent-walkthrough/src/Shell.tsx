import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Link,
  Modal,
  Popover,
  PropertyCard,
  SelectInput,
  Table,
  Tag,
  TextInput,
  usePortalTarget,
} from '@rdc-npm/rdc-ui-v4'
import { IconMoreFilled, IconArrowLeft, IconEmail, IconLink, IconUserAddToProfile, IconInfo, IconUpload, IconSyncedCloud } from '@rdc-npm/rdc-ui-v4/illustrations'
import {
  IconClients,
  IconPlus,
  IconSearch,
  IconCalendar,
  IconSupport,
  IconBell,
  IconChat,
  IconFlame,
  IconChart,
  IconStar,
  IconSort,
  IconMapView,
  IconGridView,
  IconTableView,
  IconHeart,
  IconHome,
  IconShare,
  IconExport,
  IconClientActivity,
  IconDrag,
  IconTrash,
  IconArrowDown,
  IconRealAssist,
  IconUserPlus,
  IconCatchUp,
  IconSearchSpark,
  IconCalendarClock,
  IconPanelClose,
  IconPanelOpen,
  IconExpandPanel,
  IconCollapsePanel,
  IconCompose,
  IconComposerSend,
  IconSend,
  IconPencil,
  IconSubnav,
  IconClose,
} from './icons'
import { css, cva, cx } from 'styled-system/css'
import { grid, hstack, vstack, wrap } from 'styled-system/patterns'
import {
  TOURS, TOUR_BY_ID, MOBILE_TOURS, MOBILE_TOUR_BY_ID,
  type ClientTab, type TourTab, type Condition, type DetailTab, type Route, type Sheet, type TourId,
} from './tours'
import { Coachmark } from './Coachmark'
import { useIsMobile, useIsNarrowDesktop, useViewportWidth } from './viewport'
import { track, trackOnce, setLayout, markTour, doneUrl, flush } from './telemetry'
import { AGENT, welcomeSeen, markWelcomeSeen, forgetWelcomeSeen } from './agent'
import { TourList, WelcomeDialog, type Agent, type ListCorner } from './Onboarding'

// ─── What this prototype is ───────────────────────────────────────────────────
// Realtor.com+ agent first run, "walkthrough" direction, built on the Daisy
// `client-rdc-plus` shell: the 64px NavRail, the 320px Subnav, the main header with
// its action cluster, the Clients screen, and the docked 420px RealAssist™ AI panel
// all come from the shell unchanged in structure. On top of it sit a one-time
// welcome dialog, a floating list of five short tours, and a coachmark engine that
// spotlights the real workspace. There are no forms during onboarding.
//
// Shell extensions for this prototype:
//   • a client header on the Clients screen (sample tag, summary, Client activity /
//     Chat / Add to tour) and a Client activity view that swaps in for the feed
//   • a Feed Members popover on the header title (Haven Popover), with Chat with group
//   • Chat in a floating window (bottom-right, as in the product), opened from the
//     rail's Chat cell or the Feed Members popover
//   • Schedule a tour in a Haven Modal (a tour running over it renders into the modal's
//     portal target)
//   • Invite client in a Haven Modal: client information, a public link, and bulk
//     options (spreadsheet, CRM)
//   • a Tours Subnav list and Tours screen in place of the shell's stubs
//   • Support in the rail reopens the tour list
//
// The RealAssist™ AI panel is closed by default (the shell opens it) and only opens
// from "Ask RealAssist™ AI" or a tour step that asks the agent to open it.
//
// Icons are the shell's local custom SVG set (`./icons`), ported 1:1 from the
// reference design. Haven `/illustrations` glyphs fill the few gaps (overflow ⋯,
// invite, info, upload, CRM sync).

// ─── Non-token literals ───────────────────────────────────────────────────────
// A handful of values in the source design have no Haven token equivalent and are
// kept as literals so the port matches the spec rather than drifting to a nearest
// neighbour. Keep them confined to where they belong.
//
//   BRAND_GRADIENT_PILL — the RealAssist™ AI signature coral→red→magenta (the flat
//     brand red is the `red.600` token). Confined to the header Ask pill.
//   ONLINE_GREEN   — the "online" status dot (nearest token green.900 #2A7E3B).
//   TILE_SCRIM     — the photo-tile darkening gradient the counts sit over.
//   EASE / DISPLAY_FONT — the reference's single easing curve and display typeface.
const BRAND_GRADIENT_PILL =
  'linear-gradient(95deg, rgb(240,67,73) 0%, rgb(217,34,40) 62%, rgb(194,41,138) 150%)'
const BRAND_GRADIENT_PILL_HOVER =
  'linear-gradient(95deg, rgb(198,55,60) 0%, rgb(180,28,33) 62%, rgb(160,34,114) 150%)'
const EASE = 'cubic-bezier(0.2,0.8,0.2,1)'
const DISPLAY_FONT =
  "var(--font-display, 'Galano Grotesque Alt', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)"
const ONLINE_GREEN = '#2C8C44'
const TILE_SCRIM =
  'linear-gradient(180deg, rgba(26,24,22,0) 45%, rgba(26,24,22,0.6) 100%)'
const TILE_SCRIM_DARK =
  'linear-gradient(180deg, rgba(26,24,22,0.2) 0%, rgba(26,24,22,0.45) 45%, rgba(26,24,22,0.75) 100%)'

// ─── Layout constants ─────────────────────────────────────────────────────────
const RAIL_WIDTH = '64px'
const SUBNAV_WIDTH = '320px'
const PANEL_PX = 420

// ─── Sample data ──────────────────────────────────────────────────────────────

// Profile, license, and service area come from the agent's MLS sign-in.
const agentProfile = (): Agent => ({ ...AGENT, license: 'SA.0712458', serviceArea: 'Maple Heights, Cedar Park, Lakeview' })

type Client = {
  id: string
  name: string
  initials: string
  budget: string
  listings: number
  lastSeen: string
  online?: boolean
  status: 'Active' | 'Invited' | 'Requests'
  sample?: boolean
}

// A new agent's roster is just the sample client. Alex is demo-only: a scripted chat,
// and nothing is ever sent to a real person. Invited clients join `Invited` until they
// accept and create a free realtor.com account.
const SAMPLE_CLIENT: Client = {
  id: 'alex', name: 'Alex Rivera', initials: 'AR', budget: '$550K–$650K', listings: 4,
  lastSeen: '2 hrs ago', status: 'Active', online: true, sample: true,
}
const ALEX_FIRST = 'Alex'

const SUBNAV_TABS: ClientTab[] = ['Active', 'Invited', 'Requests']
const TOUR_TABS: TourTab[] = ['Upcoming', 'Past', 'All']

// The Clients screen's three tiles.
const CLIENT_FEED = {
  savedCount: 4,
  tourRequestCount: 1,
  savedSearch: { name: 'Maple Heights, ST', sub: '$550K–$650K · 3+ bd' },
}

// Tile photos + the listing-card photos (Unsplash, the studio's placeholder source).
const IMG = {
  savedListings: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=400&fit=crop',
  tourRequests: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=400&fit=crop',
  savedSearch:  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=400&fit=crop',
}

// The filter pill row. The first entry is the default-on filter; "Chat list" has no
// listing filter behind it (it would switch views in a live prototype).
const PILLS = ['Active', 'Price change', 'Coming soon', 'Open houses', 'Closed', 'Chat list']

type ClientsView = 'map' | 'grid' | 'table'
const VIEWS: { id: ClientsView; label: string; Icon: React.ElementType }[] = [
  { id: 'map',   label: 'Map view',   Icon: IconMapView },
  { id: 'grid',  label: 'Grid view',  Icon: IconGridView },
  { id: 'table', label: 'Table view', Icon: IconTableView },
]

function ViewToggle({ view, onView }: { view: ClientsView; onView: (v: ClientsView) => void }) {
  return (
    <div className={css({ display: 'inline-flex', bg: 'bg.alternate', borderRadius: 'pill', p: '200' })}>
      {VIEWS.map(({ id, label, Icon }) => {
        const on = view === id
        return (
          <button
            key={id}
            onClick={() => onView(id)}
            aria-pressed={on} aria-label={label} title={label}
            className={css({
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              w: '44px', h: '32px', flexShrink: '0', borderRadius: 'pill', border: 'none', cursor: 'pointer',
              color: 'text.base', bg: on ? 'bg.base' : 'transparent', boxShadow: on ? 'raised' : 'none',
              _hover: on ? {} : { bg: 'bg.base' },
            })}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}

// ─── Listing feed ─────────────────────────────────────────────────────────────
// Alex's saved homes, as Haven `PropertyCard`s: `meta` is Haven's snake_case
// `PropertyMeta` shape.
type ListingPill = { text: string; kind: 'new' | 'priceDrop' | 'openHouse' }
type Listing = {
  id: string
  photo: string
  price: number
  status: string
  dom: number
  address1: string
  address2: string
  propertyType: string
  secondary: string
  meta: { beds?: number; baths_full?: number; baths_half?: number; sqft?: number }
  headline: ListingPill
  openHouse: ListingPill | null
  saved: boolean
}

const photo = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop`
const LISTINGS: Listing[] = [
  {
    id: 'l1', photo: photo('photo-1512917774080-9991f1c4c750'),
    price: 625000, status: 'NEW', dom: 2,
    address1: '1428 Maple Heights Dr', address2: 'Maple Heights, ST 00000',
    propertyType: 'Single Family Residence', secondary: '1 garage parking',
    meta: { beds: 4, baths_full: 2, baths_half: 1, sqft: 1835 },
    headline: { text: 'New 2 days ago', kind: 'new' }, openHouse: null, saved: true,
  },
  {
    id: 'l3', photo: photo('photo-1568605114967-8130f3a36994'),
    price: 540000, status: 'ACTIVE', dom: 12,
    address1: '902 Orchard Ct', address2: 'Maple Heights, ST 00000',
    propertyType: 'Single Family Residence', secondary: '2 garage parking',
    meta: { beds: 3, baths_full: 2, sqft: 1420 },
    headline: { text: 'Saved yesterday', kind: 'new' }, openHouse: { text: 'Open house Sat 1–3 PM', kind: 'openHouse' }, saved: true,
  },
  {
    id: 'l4', photo: photo('photo-1564013799919-ab600027ffc6'),
    price: 615000, status: 'PRICE CHANGE', dom: 27,
    address1: '31 Willow Bend Rd', address2: 'Maple Heights, ST 00000',
    propertyType: 'Single Family Residence', secondary: '2 garage parking',
    meta: { beds: 3, baths_full: 2, baths_half: 1, sqft: 1960 },
    headline: { text: '$635K $615K', kind: 'priceDrop' }, openHouse: null, saved: true,
  },
  {
    id: 'l5', photo: photo('photo-1570129477492-45c003edd2be'),
    price: 649000, status: 'ACTIVE', dom: 9,
    address1: '256 Cedar Ridge Way', address2: 'Cedar Park, ST 00000',
    propertyType: 'Single Family Residence', secondary: '2 garage parking',
    meta: { beds: 4, baths_full: 3, sqft: 2240 },
    headline: { text: 'Saved last week', kind: 'new' }, openHouse: null, saved: true,
  },
]
const LISTING_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'This week', ids: ['l1', 'l3', 'l4'] },
  { label: 'Last week', ids: ['l5'] },
]
const listingById = (id: string) => LISTINGS.find(l => l.id === id)!
const fmtPrice = (n: number) => `$${n.toLocaleString('en-US')}`


// Tour dates read like "Sat, Oct 17".
const fmtTourDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
// The next Saturday, used by "Show me".
function nextSaturday(now = new Date()) {
  const d = new Date(now); d.setDate(d.getDate() + (((6 - now.getDay() + 7) % 7) || 7)); return d
}

// ─── Sample-client chat ───────────────────────────────────────────────────────
type ChatMsg = { from: 'agent' | 'client'; text: string; homeId?: string }
const CHAT_OPENER: ChatMsg = { from: 'client', text: 'Hi {{first}}, I’ve been saving homes around Maple Heights. Can you help me narrow it down?' }
type Chip = { id: string; label: string; msg: ChatMsg; reply: string }
const CHIPS: Chip[] = [
  { id: 'share', label: 'Share a home', msg: { from: 'agent', text: 'Here’s one I think you’ll like.', homeId: 'l1' }, reply: 'Love the kitchen. Can we see it in person?' },
  { id: 'budget', label: 'Ask about budget', msg: { from: 'agent', text: 'What budget feels most comfortable?' }, reply: 'Around $550K–$650K, ideally in Maple Heights.' },
  { id: 'tour', label: 'Offer a tour', msg: { from: 'agent', text: 'Want to tour a few homes this weekend?' }, reply: 'Saturday morning works great.' },
]

// ─── RealAssist™ AI launcher actions ──────────────────────────────────────────
// The panel opens on this capability menu (before any turn). Each card seeds a
// canned turn that references Alex's sample data. Add Client can't import anyone:
// clients join by invite, so it points the agent at Invite client.
type AssistAction = { id: string; title: string; desc: string; Icon: React.ElementType; prompt: string; reply: string }
const ASSIST_ACTIONS: AssistAction[] = [
  { id: 'add',    title: 'Invite client',       Icon: IconUserPlus,      desc: 'Guide agent through client onboarding with members, search, and notes', prompt: 'Help me add a new client.', reply: 'Clients join Realtor.com+ by invite. Choose Invite client above your client list, add their name and email, and I’ll help set up their search once they accept.' },
  { id: 'catch',  title: 'View priorities',    Icon: IconCatchUp,       desc: 'Daily briefing that analyzes unread messages, notifications, and recent activity to suggest prioritized actions', prompt: 'Catch me up on my clients.', reply: 'Here’s your daily briefing. Alex viewed 1428 Maple Heights Dr three times since yesterday and saved 902 Orchard Ct, which has an open house Saturday. Want to suggest a tour of both?' },
  { id: 'pulse',  title: 'Check Client Pulse', Icon: IconChart,         desc: 'Analyze a client to get deeper insights, engagement patterns, member activity, and actionable suggestions', prompt: 'Show me Alex’s pulse.', reply: 'Alex is highly engaged: 23 home views this week, mostly 3–4 bed homes under $630K in Maple Heights. Weekday evenings are the best time to reach out.' },
  { id: 'search', title: 'Optimize Search',     Icon: IconSearchSpark,   desc: 'Analyze client behavior to detect preferences and recommend search refinements', prompt: 'Optimize Alex’s search.', reply: 'Alex keeps saving homes with big yards and skips anything over $640K. Want me to tighten the saved search to $550K–$640K with a yard?' },
  { id: 'tour',   title: 'Coordinate Tour',     Icon: IconCalendarClock, desc: 'Coordinate showings with timeline, instructions, and outreach messages', prompt: 'Help me plan a tour for Alex.', reply: 'I can plan a Saturday route for 1428 Maple Heights Dr and 902 Orchard Ct, about 12 minutes apart, and draft a confirmation text for Alex.' },
]
const CATCH_UP = ASSIST_ACTIONS[1]

// ─── Assistant transcript ─────────────────────────────────────────────────────
type Msg = { role: 'user' | 'ai'; text: string }

// ─── Threads (conversation history) ───────────────────────────────────────────
// The dock/overlay lists past RealAssist™ conversations. Static in the scaffold —
// rows, Edit, Delete, and Search are visual-only (no onClick / no filtering).
type Thread = { title: string; when: string }
const THREADS: Thread[] = [
  { title: 'Catch up on Alex Rivera', when: '2 hours ago' },
  { title: 'Saved homes in Maple Heights', when: 'Yesterday' },
]

type NavId = Route
const NAV_ITEMS: { id: NavId; label: string; Icon: React.ElementType }[] = [
  { id: 'clients', label: 'Clients', Icon: IconClients },
  { id: 'search',  label: 'Search',  Icon: IconSearch },
  { id: 'tours',   label: 'Tours',   Icon: IconCalendar },
]

// `sample` invites come from "Show me" (or the sample email) and are removed when the tour ends.
type Invite = { id: string; name: string; email: string; mobile: string; sample?: boolean }
type BookedTour = { id: string; homes: string[]; client: string; sample: boolean; date: string; time: string; when: 'upcoming' | 'past' }
// Tours the agent already has, so the Tours screen reads as a working list. New tours go first.
const SEED_TOURS: BookedTour[] = [
  { id: 's1', homes: ['l1', 'l3', 'l4'], client: 'Marisol Reyes & Kevin Lin', sample: false, date: 'Thu, Oct 22', time: '5:15 PM', when: 'upcoming' },
  { id: 's2', homes: ['l5', 'l1'], client: 'Arjun Patel', sample: false, date: 'Sat, Oct 24', time: '1:15 PM', when: 'upcoming' },
  { id: 's3', homes: ['l3', 'l4', 'l5'], client: 'Ngozi Okafor', sample: false, date: 'Sun, Sep 27', time: '2:15 PM', when: 'past' },
  { id: 's4', homes: ['l4', 'l1'], client: 'Thao Nguyen', sample: false, date: 'Sun, Sep 20', time: '12:15 PM', when: 'past' },
  { id: 's5', homes: ['l5', 'l3'], client: 'Rachel Goldberg & Sam Hayes', sample: false, date: 'Sun, Sep 13', time: '3:15 PM', when: 'past' },
]
const toursFor = (tours: BookedTour[], tab: TourTab) => tab === 'All' ? tours : tours.filter(t => t.when === (tab === 'Past' ? 'past' : 'upcoming'))
// Stops are half an hour apart, starting at the tour's time.
function stopTime(start: string, i: number) {
  const [, h, m, ap] = /(\d+):(\d+) (AM|PM)/.exec(start)!
  const mins = (Number(h) % 12 + (ap === 'PM' ? 12 : 0)) * 60 + Number(m) + i * 30
  const hh = Math.floor(mins / 60) % 24
  return `${hh % 12 || 12}:${String(mins % 60).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`
}
type TourModal = 'closed' | 'choose' | 'new'

// ─── Workspace state ──────────────────────────────────────────────────────────

type Workspace = {
  route: Route; sheet: Sheet; detailTab: DetailTab; clientTab: ClientTab
  subnavOpen: boolean; expanded: boolean; over: boolean
  feedMenuOpen: boolean; chatOpen: boolean; chatExpanded: boolean; tourModal: TourModal; inviteOpen: boolean
  chat: ChatMsg[]; chipsUsed: string[]
  // Homes ticked in the feed, and the new tour being built from them.
  selected: string[]
  tourTab: TourTab; tourId: string | null
  newChats: number
  // Phones show one pane at a time: the client list or a client's feed, the tour list or a tour.
  clientView: 'list' | 'feed'; tourView: 'list' | 'detail'
  // The open tour on a phone: map or list, whether the route is drawn, and how many times it was optimized.
  tourPane: 'map' | 'list'; routeShown: boolean; optimized: number; calendarAdds: number; mapsMenuOpen: boolean
  draft: { clientId: string | null; date: Date | null }
  tours: BookedTour[]; invites: Invite[]; assistMsgs: Msg[]
}
const INITIAL_WS: Workspace = {
  route: 'clients', sheet: null, detailTab: 'homes', clientTab: 'Active',
  subnavOpen: true, expanded: false, over: false, feedMenuOpen: false, chatOpen: false, chatExpanded: false, tourModal: 'closed', inviteOpen: false,
  chat: [CHAT_OPENER], chipsUsed: [], selected: [], tourTab: 'Upcoming', tourId: null, newChats: 0, clientView: 'list', tourView: 'list', tourPane: 'map', routeShown: false, optimized: 0, calendarAdds: 0, mapsMenuOpen: false, draft: { clientId: null, date: null }, tours: SEED_TOURS, invites: [], assistMsgs: [],
}
// ─── Keeping the session across reloads ───────────────────────────────────────
// A reload in the same tab keeps the agent's progress: tours done, the Getting started list,
// and what they did in the workspace (tours booked, invites, chat, RealAssist™ conversations).
// Transient UI (open dialogs and panels, a tour in progress) starts fresh. The browser doesn't
// tell a page whether a reload was "hard", so every reload keeps progress; Account → Start over
// (or closing the tab) clears it.
const STATE_KEY = 'rdcplus-onboarding:state'
const KEPT: (keyof Workspace)[] = [
  'route', 'clientTab', 'detailTab', 'clientView', 'tourView', 'tourTab', 'tourId', 'selected',
  'tours', 'invites', 'chat', 'chipsUsed', 'assistMsgs', 'newChats', 'optimized', 'calendarAdds',
]
type SavedState = { ws: Partial<Workspace>; done: Partial<Record<TourId, boolean>>; listGone: boolean; listOpen?: boolean }
// A message to show once after the page loads (for example "You've finished every tour").
const NOTE_KEY = 'rdcplus-onboarding:note'
function loadState(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedState
    // A sample invite only exists while its tour runs.
    if (saved.ws.invites) saved.ws.invites = saved.ws.invites.filter(i => !i.sample)
    return saved
  } catch {
    return null
  }
}
function saveState(ws: Workspace, done: SavedState['done'], listGone: boolean, listOpen: boolean) {
  try {
    const kept: Partial<Workspace> = {}
    for (const k of KEPT) (kept as Record<string, unknown>)[k] = ws[k]
    sessionStorage.setItem(STATE_KEY, JSON.stringify({ ws: kept, done, listGone, listOpen } satisfies SavedState))
  } catch { /* storage full or blocked: the session just won't survive a reload */ }
}

// The known state every tour starts from.
const TOUR_RESET: Partial<Workspace> = {
  route: 'clients', sheet: null, detailTab: 'homes', clientTab: 'Active',
  subnavOpen: true, expanded: false, over: false, feedMenuOpen: false, chatOpen: false, chatExpanded: false, tourModal: 'closed', inviteOpen: false, selected: [], tourTab: 'Upcoming', tourId: null, clientView: 'list', tourView: 'list', tourPane: 'map', routeShown: false, mapsMenuOpen: false, draft: { clientId: null, date: null },
}

// The view a stop's target lives in. Going Back restores it, since the agent may have
// moved on to another screen, dialog, or panel since they were last here.
function viewFor(target: string, ws: Workspace): Partial<Workspace> {
  const clients: Partial<Workspace> = { route: 'clients', tourModal: 'closed', inviteOpen: false }
  const homes = ws.selected.length ? ws.selected : ['l1', 'l3']
  switch (target) {
    case 'rail': case 'clienthead': case 'feedtiles': case 'thisweek': case 'activitytab':
      return { ...clients, chatOpen: false, feedMenuOpen: false }
    case 'clientlist': return { ...clients, subnavOpen: true }
    case 'askra': return { ...clients, sheet: null }
    case 'feedtitle': return { ...clients, feedMenuOpen: false, chatOpen: false }
    case 'feedchat': return { ...clients, feedMenuOpen: true, chatOpen: false }
    case 'chatwindow': case 'chatthread': return { ...clients, feedMenuOpen: false, chatOpen: true }
    case 'addtotour': return { ...clients, selected: homes }
    case 'tourdialog': return { route: 'clients', inviteOpen: false, selected: homes, tourModal: 'choose' }
    case 'pickdate': case 'createbtn':
      return { route: 'clients', inviteOpen: false, selected: homes, tourModal: 'new', draft: { clientId: SAMPLE_CLIENT.id, date: ws.draft.date ?? nextSaturday() } }
    case 'tourslist': return { route: 'tours', subnavOpen: true, tourModal: 'closed' }
    case 'tourdetail': case 'tourlayout': case 'tourlist': case 'tourroute': case 'touroptimize': case 'tourcalendar': case 'tourmaps':
      return { route: 'tours', subnavOpen: true, tourModal: 'closed', ...(target === 'tourroute' ? { routeShown: false } : null) }
    case 'assistpanel': case 'assistreply': case 'newchat': case 'expandpanel': case 'threads': case 'closepanel':
      return { ...clients, sheet: 'assist' }
    case 'addclient': return { ...clients, clientTab: 'Active', subnavOpen: true }
    case 'addbody': case 'inviteform': return { route: 'clients', tourModal: 'closed', inviteOpen: true }
    default: return {}
  }
}

// Where each target lives on a phone, which shows one pane at a time. Applied on every
// stop, forward and back, so the target is always on screen.
function mobileViewFor(target: string): Partial<Workspace> {
  switch (target) {
    case 'rail': return { route: 'clients', clientView: 'list', sheet: null, chatOpen: false, tourModal: 'closed', inviteOpen: false }
    case 'clientlist': case 'addclient': return { route: 'clients', clientView: 'list', sheet: null }
    case 'clienthead': case 'feedtiles': case 'feedbody': case 'thisweek': case 'activitytab': case 'feedtitle': case 'feedchat': case 'addtotour':
      return { route: 'clients', clientView: 'feed', sheet: null }
    case 'askra': return { sheet: null }
    case 'threadsbtn': return { sheet: 'assist', over: false }
    case 'tourslist': case 'tourrow': return { route: 'tours', tourView: 'list' }
    case 'tourswitch': case 'tourroute': case 'touroptimize': case 'tourcalendar': case 'tourmaps': return { route: 'tours', tourView: 'detail', tourPane: 'map', sheet: null }
    case 'tourlist': return { route: 'tours', tourView: 'detail', tourPane: 'list', sheet: null }
    default: return {}
  }
}

type Baseline = { calendarAdds: number; optimized: number; newChats: number; chat: number; tours: number; assist: number; invites: number }
const agentMsgs = (ws: Workspace) => ws.chat.filter(m => m.from === 'agent').length
const baselineOf = (ws: Workspace): Baseline => ({ calendarAdds: ws.calendarAdds, optimized: ws.optimized, newChats: ws.newChats, chat: agentMsgs(ws), tours: ws.tours.length, assist: ws.assistMsgs.length, invites: ws.invites.length })

// Conditions mean "something new happened during this tour", against the baseline.
function isMet(c: Condition, ws: Workspace, b: Baseline) {
  switch (c) {
    case 'feedMenuOpen': return ws.feedMenuOpen
    case 'chatOpen': return ws.chatOpen
    case 'chatSent': return agentMsgs(ws) > b.chat
    case 'homesPicked': return ws.selected.length > 0
    case 'addToTourOpen': return ws.tourModal !== 'closed'
    case 'newTourStarted': return ws.tourModal === 'new'
    case 'clientPicked': return !!ws.draft.clientId
    case 'datePicked': return !!ws.draft.date
    case 'tourBooked': return ws.tours.length > b.tours
    case 'assistOpen': return ws.sheet === 'assist'
    case 'tourOpened': return ws.route === 'tours' && ws.tourView === 'detail'
    case 'tourListShown': return ws.tourPane === 'list'
    case 'routeShown': return ws.routeShown
    case 'tourOptimized': return ws.optimized > b.optimized
    case 'calendarAdded': return ws.calendarAdds > b.calendarAdds
    case 'threadsOpen': return ws.over
    case 'mapsMenuOpen': return ws.mapsMenuOpen
    case 'assistNewChat': return ws.newChats > b.newChats
    case 'assistExpanded': return ws.expanded
    case 'assistCollapsed': return !ws.expanded
    case 'assistAsked': return ws.assistMsgs.length > b.assist
    case 'addOpen': return ws.inviteOpen
    case 'invited': return ws.invites.length > b.invites
  }
}

// ─── Preferences ──────────────────────────────────────────────────────────────
// Production persists progress in user preferences. The prototype keeps it in
// memory, so a refresh restarts the first run for demos.
type Prefs = { toursDone: Partial<Record<TourId, boolean>>; listDismissed: boolean; welcomeSeen: boolean }
function savePrefs(_prefs: Prefs) {
  // Stub: replace with the user-preferences call, e.g. PATCH /me/preferences/onboarding.
}

function initialsOf(name: string) {
  return name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
}

// ─── Shared primitives ────────────────────────────────────────────────────────
// The reference chrome is built from a small set of hand-rolled primitives rather
// than Haven Button styleTypes — that is what keeps every circle, pill, and hover
// treatment pixel-consistent across the shell. We reproduce them here in Panda
// (inline `style` is confined to the brand gradient and the panel's transforms).

// A transparent icon circle whose hover fills with one of three reference tones
// (hair #E9E7E4 / border #D3CFCA / iconHover #BDB7B0). `bordered` gives the white,
// hairline-bordered variant that raises on hover instead.
const circleButton = cva({
  base: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'circle', flexShrink: '0', cursor: 'pointer', p: '0',
    color: 'text.base', fontFamily: 'inherit', transition: '[background 120ms, box-shadow 120ms]',
  },
  variants: {
    bordered: {
      true: { borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', bg: 'bg.base', _hover: { boxShadow: 'raised' } },
      false: { border: 'none', bg: 'transparent' },
    },
    hoverTone: { hair: {}, border: {}, iconHover: {} },
  },
  compoundVariants: [
    { bordered: false, hoverTone: 'hair', css: { _hover: { bg: 'gray.200' } } },
    { bordered: false, hoverTone: 'border', css: { _hover: { bg: 'gray.300' } } },
    { bordered: false, hoverTone: 'iconHover', css: { _hover: { bg: '[#BDB7B0]' } } },
  ],
  defaultVariants: { bordered: false, hoverTone: 'hair' },
})

function CircleButton({
  size = 36, bordered, hoverTone = 'hair', color, label, pressed, onClick, style, children,
}: {
  size?: number; bordered?: boolean; hoverTone?: 'hair' | 'border' | 'iconHover'
  color?: string; label: string; pressed?: boolean; onClick?: () => void
  style?: React.CSSProperties; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={circleButton({ bordered: !!bordered, hoverTone })}
      style={{ width: size, height: size, ...(color ? { color } : null), ...style }}
    >
      {children}
    </button>
  )
}

// A square initials avatar (the reference's Initials primitive — dark chip, white
// glyphs, DISPLAY_FONT). Replaces Haven Avatar in the rail and client rows.
function Initials({ initials, size = 40, fontSize = 13 }: { initials: string; size?: number; fontSize?: number }) {
  return (
    <span
      aria-hidden="true"
      className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', borderRadius: 'circle', bg: 'bg.inverse', color: 'text.inverse', fontWeight: 'normal' })}
      style={{ width: size, height: size, fontSize, fontFamily: DISPLAY_FONT }}
    >
      {initials}
    </span>
  )
}

// Section heading in the DISPLAY_FONT with the reference's tight tracking.
// Desktop panel titles match the page header (24px); `compact` keeps the 16px title phones use.
function Heading({ as: Tag = 'h2', className, compact, children }: { as?: React.ElementType; className?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <Tag
      className={cx(css({ m: '0', fontWeight: 'semibold', color: 'text.base' }), className)}
      style={{ fontFamily: DISPLAY_FONT, ...(compact ? { fontSize: 16, lineHeight: '20px', letterSpacing: '-0.01em' } : { fontSize: 24, lineHeight: '28px', letterSpacing: '-0.02em' }) }}
    >
      {children}
    </Tag>
  )
}

// Pill-shaped search input with a leading magnifier (inert stand-in).
function SearchField({ placeholder, ariaLabel, flush }: { placeholder: string; ariaLabel: string; flush?: boolean }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '300', flexShrink: '0', h: '[38px]', px: '[14px]', mx: flush ? '0' : '400', borderRadius: '[40px]', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', bg: 'bg.base' })}>
      <IconSearch size={14} className={css({ color: 'text.alternate' })} />
      <input
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={css({ flex: '[1 1 auto]', minW: '0', bg: 'transparent', border: 'none', outline: 'none', color: 'text.base', fontFamily: 'inherit' })}
        style={{ fontSize: 13 }}
      />
    </div>
  )
}

// The muted "nothing here" note used by empty lists.
function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className={css({ p: '400', color: 'text.alternate' })} style={{ fontSize: 12 }}>{children}</div>
}

// The notice that keeps every Alex surface honest about being a sample.
function SampleNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className={hstack({ gap: '200', alignItems: 'flex-start', px: '400', py: '300', bg: 'bg.alternate', borderRadius: '300', color: 'text.base', m: '0' })} style={{ fontSize: 13, lineHeight: '18px' }}>
      <span className={css({ display: 'flex', flexShrink: '0', mt: '[1px]' })}><IconInfo size={2} /></span>
      <span>{children}</span>
    </p>
  )
}

// A ⋯ overflow menu — the shell's only dropdown. Minimal-functional: opens on click,
// closes on outside-click or Escape. Positioned with absolute (the reference measures
// and uses fixed; absolute is enough for a scaffold).
type MenuItem = { label?: string; onClick?: () => void; destructive?: boolean; separator?: boolean }
function Menu({ items, label = 'More', size = 36, hoverTone = 'hair', color, secondary = false }: {
  items: MenuItem[]; label?: string; size?: number; hoverTone?: 'hair' | 'border' | 'iconHover'; color?: string
  // `secondary` renders the ⋯ trigger as a Secondary pill circle (matching the header
  // action cluster) instead of the transparent hover-fill CircleButton used elsewhere.
  secondary?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className={css({ position: 'relative', flexShrink: '0' })} ref={ref}>
      {secondary ? (
        <Button
          styleType="Secondary" size="sm"
          iconOnly={<IconMoreFilled size={2} />}
          aria-label={label} aria-expanded={open} title={label}
          onClick={() => setOpen(o => !o)}
        />
      ) : (
      <CircleButton size={size} hoverTone={hoverTone} color={color} label={label} pressed={open} onClick={() => setOpen(o => !o)}>
        <IconMoreFilled size={2} />
      </CircleButton>
      )}
      {open && (
        <div
          role="menu"
          className={css({ position: 'absolute', top: '[calc(100% + 4px)]', right: '0', zIndex: '[100]', minW: '[180px]', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'gray.200', borderRadius: '300', p: '[6px]', display: 'flex', flexDirection: 'column', gap: '[2px]' })}
          style={{ boxShadow: '0 1px 2px rgba(26,24,22,0.08), 0 8px 24px rgba(26,24,22,0.16)' }}
        >
          {items.map((it, i) => it.separator ? (
            <div key={i} className={css({ h: '[1px]', bg: 'gray.200', mx: '300', my: '[5px]' })} />
          ) : (
            <button
              key={i}
              role="menuitem"
              onClick={() => { it.onClick?.(); setOpen(false) }}
              className={css({ display: 'flex', alignItems: 'center', gap: '[10px]', h: '[38px]', px: '400', borderRadius: '[10px]', border: 'none', bg: 'transparent', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: 'inherit', fontWeight: 'medium', color: it.destructive ? 'red.600' : 'text.base', _hover: { bg: 'bg.alternate' } })}
              style={{ fontSize: 14 }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── NavRail ──────────────────────────────────────────────────────────────────
// One rail cell: an icon in a rounded container with its label below. The active /
// hover highlight fills only the icon container; the label sits outside it.

function RailCell({
  icon, label, active, onClick, plain, title,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; plain?: boolean; title?: string }) {
  const content = (
    <>
      <span
        className={css({
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          px: '400', py: '300', borderRadius: '[14px]',
          bg: active ? 'bg.alternate' : 'transparent',
          _groupHover: active ? undefined : { bg: 'bg.alternate' },
        })}
      >
        {icon}
      </span>
      <span className={css({ fontSize: '11px', lineHeight: '14px', fontWeight: active ? '[800]' : 'semibold', maxW: '100%', textAlign: 'center' })}>
        {label}
      </span>
    </>
  )
  const base = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '[5px]', w: '100%', flexShrink: '0', bg: 'transparent', border: 'none', fontFamily: 'inherit',
  } as const
  if (plain && !onClick) {
    return <div title={title} className={cx('group', css({ ...base, color: 'text.alternate', cursor: 'default' }))}>{content}</div>
  }
  return (
    <button
      onClick={onClick}
      title={title}
      aria-current={active ? 'page' : undefined}
      className={cx('group', css({ ...base, cursor: 'pointer', color: active ? 'text.base' : 'text.alternate', _hover: { color: 'text.base' } }))}
    >
      {content}
    </button>
  )
}

// Secondary cells: Support reopens the Getting started tours; Chat opens the chat
// modal; Alerts stays inert.
function NavRail({ active, onNavigate, onSupport, onChat }: {
  active: NavId; onNavigate: (id: NavId) => void; onSupport: () => void; onChat: () => void
}) {
  return (
    <nav
      aria-label="Main"
      data-tour="rail"
      className={vstack({
        alignItems: 'center', gap: '400', flexShrink: '0', bg: 'bg.base',
        borderRightWidth: '100', borderRightStyle: 'solid', borderColor: 'gray.200',
        px: '[6px]', py: '400', overflow: 'hidden',
      })}
      style={{ width: RAIL_WIDTH }}
    >
      <img
        src="assets/logo-rail-collapsed.svg"
        alt="realtor.com+"
        className={css({ h: '3rem', w: 'auto', display: 'block', mb: '300', ml: '200', flexShrink: '0' })}
      />

      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <RailCell key={id} icon={<Icon size={20} />} label={label} active={active === id} onClick={() => onNavigate(id)} />
      ))}

      <div className={css({ flex: '1' })} />

      <RailCell icon={<IconSupport size={20} />} label="Support" title="Support and Getting started tours" onClick={onSupport} />
      <RailCell icon={<IconBell size={20} />} label="Alerts" />
      <RailCell icon={<IconChat size={20} />} label="Chat" onClick={onChat} />

      {/* Account — opens "Start over" (see Shell) */}
      <RailCell
        plain
        onClick={openAccount}
        title={`${AGENT.name} · ${AGENT.brokerage}`}
        label="Account"
        icon={<Initials initials={AGENT.initials} size={30} fontSize={12} />}
      />
    </nav>
  )
}

const openAccount = () => window.dispatchEvent(new Event('wt:account'))

// ─── Subnav (Clients / Tours) ─────────────────────────────────────────────────

// A square initials avatar with an optional green "online" status dot overlaid
// bottom-right (10px, ringed in the panel bg so it reads as a cut-out).
function AvatarWithStatus({ name, initials, size = 40, online }: { name: string; initials: string; size?: number; online?: boolean }) {
  return (
    <div className={css({ position: 'relative', flexShrink: '0' })}>
      <Initials initials={initials} size={size} />
      {online && (
        <span
          aria-label={`${name} is online`}
          className={css({
            position: 'absolute', bottom: '0', right: '0',
            w: '[10px]', h: '[10px]', borderRadius: 'circle',
            borderWidth: '200', borderStyle: 'solid', borderColor: 'bg.alternate',
          })}
          style={{ background: ONLINE_GREEN }}
        />
      )}
    </div>
  )
}

// A single client tab in the borderless Clients strip — bold dark when active,
// muted otherwise (no underline, matching the reference).
function SubnavTab({ label, active, onClick, tourId }: { label: string; active: boolean; onClick: () => void; tourId?: string }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      data-tour={tourId}
      className={css({
        bg: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        px: '0', py: '100', fontWeight: active ? 'bold' : 'medium',
        color: active ? 'text.base' : 'text.alternate', _hover: { color: 'text.base' },
      })}
      style={{ fontSize: 13 }}
    >
      {label}
    </button>
  )
}

function Subnav({ variant, activeId, shown, onClose, tab, onTab, clients, tours, tourTab, onTourTab, tourId, onPickTour, onInvite, mobile, onPickClient }: {
  variant: 'clients' | 'tours'; activeId?: string; shown: boolean; onClose: () => void
  tab: ClientTab; onTab: (t: ClientTab) => void; clients: Client[]; tours: BookedTour[]
  tourTab: TourTab; onTourTab: (t: TourTab) => void; tourId?: string; onPickTour: (id: string) => void; onInvite: () => void
  // Phones: the subnav is the whole screen, and a client row opens that client's feed.
  mobile?: boolean; onPickClient?: (id: string) => void
}) {
  const title = variant === 'clients' ? 'Clients' : 'Tours'
  const rows = variant === 'clients' ? clients.filter(c => c.status === tab) : []
  const count = (t: ClientTab) => clients.filter(c => c.status === t).length

  // Animated collapse: the outer wrapper drives width 320↔0; the inner column
  // keeps its fixed 320 so its content doesn't reflow while it slides away.
  return (
    <div
      className={css({ flexShrink: '0', overflow: 'hidden' })}
      style={mobile ? { flex: '1', minHeight: 0 } : { width: shown ? SUBNAV_WIDTH : '0px', transition: `width 220ms ${EASE}` }}
      aria-hidden={!shown}
      data-tour={variant === 'clients' ? 'clientlist' : 'tourslist'}
    >
      <div
        className={vstack({
          alignItems: 'stretch', gap: '400', h: '100%', bg: 'bg.alternate',
          borderRightWidth: '100', borderRightStyle: 'solid', borderColor: 'gray.200',
          overflowY: 'auto',
        })}
        style={{ width: mobile ? '100%' : SUBNAV_WIDTH }}
      >
        {/* Header */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '200', pt: '[18px]', pr: '400', pb: '400', pl: '[20px]' })}>
          <Heading compact={mobile} className={css({ flex: '[1 1 auto]' })}>{title}</Heading>
          <Menu label="Sort and manage" hoverTone="border" items={[
            { label: 'Sort by name' }, { label: 'Sort by recent activity' },
            { separator: true }, { label: 'Manage clients' },
          ]} />
          {variant === 'clients' && (
            <span data-tour="addclient" className={css({ display: 'flex', borderRadius: 'circle' })}>
              <CircleButton label="Invite client" hoverTone="border" onClick={onInvite}><IconUserAddToProfile size={2} /></CircleButton>
            </span>
          )}
          {mobile && variant === 'clients' && (
            <span className={css({ position: 'relative', display: 'flex' })}>
              <CircleButton label="Notifications" hoverTone="border"><IconBell size={18} /></CircleButton>
              <span aria-hidden className={css({ position: 'absolute', top: '0', right: '0', minW: '[16px]', h: '[16px]', px: '[4px]', borderRadius: 'pill', bg: '[#B41C21]', color: 'text.inverse', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' })} style={{ fontSize: 10 }}>3</span>
            </span>
          )}
          {!mobile && <CircleButton label="Hide panel" hoverTone="border" onClick={onClose}><IconPanelClose size={16} /></CircleButton>}
          {mobile && <MobileAccount />}
        </div>

        {variant === 'clients' ? (
          <>
            {/* Agent's own feed */}
            <div className={css({ display: 'flex', gap: '300', alignItems: 'center', mx: '400' })}>
              <AvatarWithStatus name={AGENT.name} initials={AGENT.initials} online />
              <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
                <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0' })} style={{ fontSize: 13.5 }}>{AGENT.name}</p>
                <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 11.5 }}>My Personal Feed</p>
              </div>
              <Menu label={`${AGENT.name} options`} size={28} items={[
                { label: 'Edit feed' }, { label: 'Notification settings' },
              ]} />
            </div>

            {/* Search — inert stand-in */}
            <SearchField placeholder="Search client…" ariaLabel="Search clients" />

            {/* Tabs — borderless text strip, with counts */}
            <div className={css({ display: 'flex', alignItems: 'center', gap: '500', px: '[20px]' })}>
              {SUBNAV_TABS.map(t => (
                <SubnavTab key={t} label={`${t} (${count(t)})`} active={tab === t} onClick={() => onTab(t)}
                  tourId={t === 'Invited' ? 'invitedtab' : undefined} />
              ))}
            </div>

            {/* Client rows */}
            <div className={vstack({ alignItems: 'stretch', gap: '[2px]', mx: '300' })}>
              {rows.map(c => {
                const selected = c.id === activeId
                return (
                  <div
                    key={c.id}
                    onClick={onPickClient && c.status === 'Active' ? e => { if (!(e.target as HTMLElement).closest('button')) onPickClient(c.id) } : undefined}
                    className={hstack({ gap: '300', alignItems: 'center', p: '300', borderRadius: '300', bg: selected && !mobile ? 'gray.200' : 'transparent', cursor: onPickClient ? 'pointer' : 'default', _hover: { bg: 'gray.200' } })}
                  >
                    <AvatarWithStatus name={c.name} initials={c.initials} online={c.online} />
                    <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
                      <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} style={{ fontSize: 13.5 }}>{c.name}</p>
                      <p className={css({ color: 'text.alternate', m: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} style={{ fontSize: 11.5 }}>
                        {c.status === 'Invited' ? c.lastSeen : `${c.listings} listings · ${c.lastSeen}`}
                      </p>
                    </div>
                    {c.sample && <Tag dataColor="yellowSubtle">Sample</Tag>}
                    {c.status === 'Invited' && <Tag dataColor="graySubtle">Waiting</Tag>}
                    <Menu label={`${c.name} options`} size={28} items={c.status === 'Invited' ? [
                      { label: 'Re-send invite' }, { separator: true }, { label: 'Cancel invite', destructive: true },
                    ] : [
                      { label: 'View profile' }, { label: 'Mute notifications' },
                      { separator: true }, { label: 'Remove client', destructive: true },
                    ]} />
                  </div>
                )
              })}
              {rows.length === 0 && (
                <EmptyNote>{tab === 'Invited' ? 'No invited clients yet. Choose Invite client to send one.' : `No ${tab.toLowerCase()} yet.`}</EmptyNote>
              )}
            </div>
          </>
        ) : (
          <>
            <SearchField placeholder="Search by client name" ariaLabel="Search tours" />
            <div className={css({ display: 'flex', alignItems: 'center', gap: '500', px: '[20px]' })}>
              {TOUR_TABS.map(t => (
                <SubnavTab key={t} label={t === 'All' ? t : `${t} (${toursFor(tours, t).length})`} active={tourTab === t} onClick={() => onTourTab(t)} />
              ))}
            </div>
            <div className={vstack({ alignItems: 'stretch', gap: '[2px]', mx: '300' })}>
              {toursFor(tours, tourTab).map((t, ti) => (
                <button
                  key={t.id} data-tour={ti === 0 ? 'tourrow' : undefined} type="button" onClick={() => onPickTour(t.id)} aria-current={t.id === tourId ? 'true' : undefined}
                  className={hstack({ gap: '300', alignItems: 'center', p: '300', borderRadius: '300', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', bg: t.id === tourId ? 'gray.200' : 'transparent', _hover: { bg: 'gray.200' } })}
                >
                  <AvatarWithStatus name={t.client} initials={initialsOf(t.client)} online={false} />
                  <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
                    <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} style={{ fontSize: 13.5 }}>{t.client}</p>
                    <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 11.5 }}>{t.date} | {t.time} | {t.homes.length} {t.homes.length === 1 ? 'Stop' : 'Stops'}</p>
                  </div>
                </button>
              ))}
              {toursFor(tours, tourTab).length === 0 && <EmptyNote>No tours here yet. Select homes in a client’s feed and choose Add to tour.</EmptyNote>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Search header (prototype extension) ──────────────────────────────────────

const SEARCH_FILTERS = ['Price', 'Property type', 'Status', 'Bedrooms', 'Bathrooms', '# of parking spots', 'Square feet', 'Has an open house']

function SearchFilters() {
  const [view, setView] = useState<ClientsView>('map')
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '200', flexWrap: 'wrap' })}>
      <Button styleType="Secondary" size="sm" startIcon={<IconSort />}>Filters</Button>
      <span className={css({ display: 'flex', '& button': { borderColor: '[#B41C21]', color: '[#B41C21]' } })}>
        <Button styleType="Secondary" size="sm" startIcon={<IconFlame size={16} />}>Hotsheet</Button>
      </span>
      {SEARCH_FILTERS.map(f => <Button key={f} styleType="Secondary" size="sm">{f}</Button>)}
      <div className={css({ flex: '1' })} />
      <ViewToggle view={view} onView={setView} />
    </div>
  )
}

// ─── Main header ──────────────────────────────────────────────────────────────

// The header pill vocabulary — one `cva` covers the two shapes the reference uses:
// a text pill (px 16, radius 40) and a collapsed 36px icon circle. `tone` picks the
// fill: `brand` (gradient, applied inline, the Ask pill) and `light` (bordered white
// — the Secondary treatment the whole action cluster uses, in both shapes). The `dark`
// inverse chip is retained for completeness but no longer used by the cluster.
const actionPill = cva({
  base: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '[8px]',
    h: '[36px]', flexShrink: '0', cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 'semibold', whiteSpace: 'nowrap', transition: '[background 120ms, box-shadow 120ms]',
  },
  variants: {
    collapsed: {
      true: { w: '[36px]', px: '0', borderRadius: 'circle' },
      false: { px: '500', borderRadius: '[40px]' },
    },
    tone: {
      brand: { border: 'none', color: 'text.inverse', boxShadow: 'raised' },
      dark: { borderWidth: '100', borderStyle: 'solid', borderColor: 'bg.inverse', bg: 'bg.inverse', color: 'text.inverse' },
      light: { borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', bg: 'bg.base', color: 'text.base', _hover: { bg: 'gray.200' } },
    },
  },
  defaultVariants: { collapsed: false, tone: 'light' },
})

function ActionPill({
  tone = 'light', collapsed, label, pressed, onClick, icon, tourId, children,
}: {
  tone?: 'brand' | 'dark' | 'light'; collapsed?: boolean; label: string
  pressed?: boolean; onClick?: () => void; icon?: React.ReactNode; tourId?: string; children?: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  const brand = tone === 'brand'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      data-tour={tourId}
      onMouseEnter={brand ? () => setHover(true) : undefined}
      onMouseLeave={brand ? () => setHover(false) : undefined}
      className={actionPill({ collapsed: !!collapsed, tone })}
      style={{ fontSize: 14, ...(brand ? { background: hover ? BRAND_GRADIENT_PILL_HOVER : BRAND_GRADIENT_PILL } : null) }}
    >
      {icon}
      {children}
    </button>
  )
}

// The collapsible members of the action cluster, ordered left→right. Each shows its
// text label when there's room and folds to an icon-only circle when the header narrows.
// Labels are shed left-first (Hotsheets first, Favorites last), matching the reference.
const FOLD_ITEMS: { label: string; icon: React.ReactNode }[] = [
  { label: 'Agent notifications', icon: <IconBell size={17} /> },
  { label: 'Hotsheets',           icon: <IconFlame size={20} /> },
  { label: 'Market data',         icon: <IconChart size={20} /> },
  { label: 'Favorites',           icon: <IconStar size={20} /> },
]

// The header action cluster. All members are Haven `Button styleType="Secondary"` (the
// design-system Secondary button — outlined, no dark toggle state). The bell/flame/chart/star
// buttons fold responsively: at wide widths they render with a label (`startIcon` + text); as
// the header narrows they collapse to `iconOnly`, shedding labels left-first. Only the ⋯ Menu
// stays icon-only always; the Ask pill (brand gradient) is the sole RealAssist™ entry point,
// shown only when the panel is closed.
//
// The fold is measured, not breakpoint-based: on every resize (and whenever the Ask pill
// appears/disappears) we optimistically assume all labels fit, then shed them one at a
// time in a layout effect until the row stops overflowing. We can't use scrollWidth here —
// with `justify-content: flex-end` the pills overflow to the *left*, which scrollWidth
// doesn't count — so we sum the children's actual widths plus the gaps and compare that to
// the row's available width. Shedding a label never resizes the row (its box is sized by
// the flex parent, not its contents), so there's no ResizeObserver feedback loop.
// `primary` is the screen's own dark action (Client activity on a client feed). It sits
// left of the Ask pill and never folds.
// `bare` drops the Agent notifications / Hotsheets / Market data / Favorites cluster (Search has its own).
function ActionBar({ onAsk, panelOpen, primary, bare, secondary, items = FOLD_ITEMS, moreItems }: { onAsk: () => void; panelOpen: boolean; primary?: React.ReactNode; bare?: boolean; secondary?: React.ReactNode; items?: typeof FOLD_ITEMS; moreItems?: MenuItem[] }) {
  const rowRef = useRef<HTMLDivElement>(null)
  // Number of collapsible pills (counted from the right — Favorites first) showing a label.
  const [labeled, setLabeled] = useState(items.length)
  // Bumped on every reset so the layout effect re-measures even when `labeled` is already
  // at its max (otherwise a row that narrows while fully labeled never sheds).
  const [measure, setMeasure] = useState(0)

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row || labeled === 0) return
    const kids = Array.from(row.children) as HTMLElement[]
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0
    const needed = kids.reduce((sum, k) => sum + k.offsetWidth, 0) + gap * Math.max(0, kids.length - 1)
    if (needed > row.clientWidth + 1) setLabeled(n => n - 1)
  }, [labeled, measure])

  // Reset to fully-labeled on any width change, when the Ask pill toggles, and once web
  // fonts load, then let the layout effect above re-shed to the right level (this also
  // handles *un*folding as space grows).
  useEffect(() => {
    const reset = () => { setLabeled(items.length); setMeasure(m => m + 1) }
    reset()
    document.fonts?.ready.then(reset)
    const row = rowRef.current
    if (!row) return
    const ro = new ResizeObserver(reset)
    ro.observe(row)
    return () => ro.disconnect()
  }, [panelOpen])

  const foldThreshold = items.length - labeled // indices below this collapse to icons
  return (
    <div ref={rowRef} className={css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '300', flex: bare ? '[0 0 auto]' : '[1 1 0]', ml: bare ? 'auto' : '0', minW: '0', overflow: 'hidden' })}>
      <span data-tour="tourmore" className={css({ display: 'flex', flexShrink: '0' })}>
        <Menu secondary label="More actions" items={moreItems ?? [
        { label: 'Export list' }, { label: 'Print' },
        { separator: true }, { label: 'View settings' },
      ]} />
      </span>
      {!bare && items.map((it, i) => {
        const collapsed = i < foldThreshold
        // Wrapped so the flex row can't shrink the button below its natural width — the
        // fold measurement above sums each child's offsetWidth, which relies on that.
        return (
          <span key={it.label} className={css({ flexShrink: '0', display: 'flex' })}>
            {collapsed ? (
              <Button styleType="Secondary" size="sm" iconOnly={it.icon} aria-label={it.label} title={it.label} />
            ) : (
              <Button styleType="Secondary" size="sm" startIcon={it.icon} title={it.label}>{it.label}</Button>
            )}
          </span>
        )
      })}
      {secondary && <span className={css({ flexShrink: '0', display: 'flex' })}>{secondary}</span>}
      {primary && <span className={css({ flexShrink: '0', display: 'flex' })}>{primary}</span>}
      {!panelOpen && (
        <ActionPill tone="brand" label="Ask RealAssist AI" onClick={onAsk} icon={<IconRealAssist size={16} />} tourId="askra">Ask RealAssist™ AI</ActionPill>
      )}
    </div>
  )
}

// Feed Members popover (prototype extension), as in the product: choosing the feed
// title opens it. "Chat with group" opens the chat window. Haven Popover closes on any
// outside press, including the coachmark; Show me opens chat directly, so tours still work.
function FeedPopover({ open, onOpenChange, onChat }: {
  open: boolean; onOpenChange: (open: boolean) => void; onChat: () => void
}) {
  const row = hstack({ gap: '300', px: '300', py: '300' })
  return (
    <Popover
      open={open}
      onClose={() => onOpenChange(false)}
      placement="bottom-start"
      offset={8}
      maxWidth="300px"
      header={
        <div className={hstack({ gap: '200', justifyContent: 'space-between', w: '100%' })}>
          <span>Feed Members</span>
          <Button styleType="Ghost" size="inline" endIcon={<IconPencil size={12} />}>Edit</Button>
        </div>
      }
      body={
        <div className={vstack({ alignItems: 'stretch', gap: '300', mt: '300' })}>
          <span data-tour="feedchat" className={css({ display: 'flex', flexDirection: 'column' })}>
            <Button styleType="Primary" size="sm" startIcon={<IconShare size={14} />} onClick={onChat}>Chat with group</Button>
          </span>
          <div className={vstack({ alignItems: 'stretch', gap: '0', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '300' })}>
            <div className={row}>
              <Initials initials={SAMPLE_CLIENT.initials} size={32} fontSize={12} />
              <span className={css({ flex: '1', color: 'text.base' })} style={{ fontSize: 14 }}>{SAMPLE_CLIENT.name}</span>
              <Tag dataColor="yellowSubtle">Sample</Tag>
            </div>
            <div className={row}>
              <span className={css({ display: 'flex', w: '[32px]', justifyContent: 'center', color: 'text.alternate' })}><IconEmail size={2} /></span>
              <span className={css({ flex: '1', color: 'text.base' })} style={{ fontSize: 14 }}>alex.rivera@email.com</span>
            </div>
            <div className={cx(row, css({ borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' }))}>
              <Initials initials={AGENT.initials} size={32} fontSize={12} />
              <span className={css({ flex: '1', color: 'text.base' })} style={{ fontSize: 14 }}>{AGENT.name} (you)</span>
            </div>
          </div>
        </div>
      }
    >
      <button
        type="button" data-tour="feedtitle" aria-expanded={open} aria-haspopup="dialog" onClick={() => onOpenChange(!open)}
        aria-label={`${SAMPLE_CLIENT.name}: feed members`}
        className={css({ display: 'flex', alignItems: 'center', gap: '300', maxW: '100%', p: '0', border: 'none', bg: 'transparent', cursor: 'pointer', color: 'text.base', fontFamily: 'inherit' })}
      >
        <h1
          className={css({ m: '0', fontWeight: 'semibold', color: 'text.base', minW: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
          style={{ fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: '28px', letterSpacing: '-0.02em' }}
        >{SAMPLE_CLIENT.name}</h1>
        <Initials initials={SAMPLE_CLIENT.initials} size={28} fontSize={11} />
      </button>
    </Popover>
  )
}

function MainHeader({
  title, onAsk, panelOpen, showSubnavButton, subnavLabel, onOpenSubnav, feed, primary, secondary, lead, below, bare, items, moreItems,
}: {
  title: string; onAsk: () => void; panelOpen: boolean
  showSubnavButton?: boolean; subnavLabel?: string; onOpenSubnav?: () => void
  // On Clients the title is the client feed, which opens the feed popover.
  feed?: React.ReactNode
  primary?: React.ReactNode; secondary?: React.ReactNode; bare?: boolean; items?: typeof FOLD_ITEMS; moreItems?: MenuItem[]
  // Search: a search field in place of the title, a filter row under the header, and no action cluster.
  lead?: React.ReactNode; below?: React.ReactNode
}) {
  return (
    <header className={vstack({ alignItems: 'stretch', gap: '400', px: '600', py: '500', bg: 'bg.base', flexShrink: '0' })}>
    <div className={css({ display: 'flex', alignItems: 'center', gap: '400' })}>
      {/* Show-subnav control — appears only when the Clients/Tours subnav is collapsed */}
      {showSubnavButton && (
        <CircleButton size={32} label={subnavLabel ? `Show ${subnavLabel}` : 'Show panel'} onClick={onOpenSubnav}>
          <IconPanelOpen size={18} />
        </CircleButton>
      )}
      {lead ?? <div className={vstack({ alignItems: 'flex-start', gap: '[2px]', minW: '0', maxW: '45%' })}>
        {feed ?? <h1
          className={css({ m: '0', fontWeight: 'semibold', color: 'text.base', maxW: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
          style={{ fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: '28px', letterSpacing: '-0.02em' }}
        >{title}</h1>}
      </div>}
      <ActionBar onAsk={onAsk} panelOpen={panelOpen} primary={primary} secondary={secondary} bare={bare || !!lead} items={items} moreItems={moreItems} />
    </div>
    {below}
    </header>
  )
}

// ─── Clients screen (built out) ───────────────────────────────────────────────

// A 124px photo tile with a scrim and an overlaid count / label.
function CountTile({ src, count, label, compact }: { src: string; count: number; label: string; compact?: boolean }) {
  const px = compact ? 88 : 124
  return (
    <div style={{ width: px, height: px }} className={css({ position: 'relative', flexShrink: '0', borderRadius: '300', overflow: 'hidden', boxShadow: 'raised', bg: 'bg.alternate' })}>
      <img src={src} alt="" loading="lazy" className={css({ position: 'absolute', inset: '0', w: '100%', h: '100%', objectFit: 'cover' })} />
      <div className={css({ position: 'absolute', inset: '0', pointerEvents: 'none' })} style={{ background: TILE_SCRIM }} />
      <div className={css({ position: 'absolute', left: compact ? '10px' : '14px', bottom: compact ? '8px' : '12px', color: 'white', pointerEvents: 'none' })}>
        <div className={css({ fontWeight: 'bold' })} style={{ fontSize: compact ? 17 : 22, lineHeight: compact ? '20px' : '26px' }}>{count}</div>
        <div className={css({ fontWeight: 'semibold' })} style={{ fontSize: compact ? 11 : 13 }}>{label}</div>
      </div>
    </div>
  )
}

// The dark "Saved Searches" tile — two lines of copy over a deeper scrim.
function SavedSearchTile({ src, name, sub, compact }: { src: string; name: string; sub: string; compact?: boolean }) {
  const px = compact ? 88 : 124
  return (
    <div style={{ width: px, height: px }} className={css({ position: 'relative', flexShrink: '0', borderRadius: '300', overflow: 'hidden', boxShadow: 'raised', bg: 'bg.inverse' })}>
      <img src={src} alt="" loading="lazy" className={css({ position: 'absolute', inset: '0', w: '100%', h: '100%', objectFit: 'cover' })} />
      <div className={css({ position: 'absolute', inset: '0', pointerEvents: 'none' })} style={{ background: TILE_SCRIM_DARK }} />
      <div className={css({ position: 'absolute', left: compact ? '8px' : '14px', right: compact ? '8px' : '14px', bottom: compact ? '8px' : '12px', color: 'white', pointerEvents: 'none' })}>
        <div className={css({ fontWeight: 'bold', lineHeight: '1.3' })} style={{ fontSize: compact ? 11 : 14 }}>{name}</div>
        <div className={css({ fontWeight: 'medium', opacity: '0.85', mt: '100' })} style={{ fontSize: compact ? 9 : 12 }}>{sub}</div>
      </div>
    </div>
  )
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h3 className={css({ textStyle: 'headingSm', color: 'text.base', m: '0' })}>{children}</h3>
}

// One overlay pill. A `priceDrop` carries two prices with the old one struck through.
function Pill({ pill }: { pill: ListingPill }) {
  if (pill.kind === 'priceDrop') {
    const [was, now] = pill.text.split(' ')
    return (
      <Tag dataColor="greenSubtle" endIcon={<IconArrowDown />}>
        <span style={{ textDecoration: 'line-through', opacity: 0.75 }}>{was}</span> <span>{now}</span>
      </Tag>
    )
  }
  return <Tag dataColor={pill.kind === 'new' ? 'red' : 'greenSubtle'}>{pill.text}</Tag>
}

// Bare circular icon button — the listing action row's icons take chrome only on hover.
function ActionButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return <CircleButton size={26} label={label} onClick={onClick}>{children}</CircleButton>
}

function ListingCard({ listing, selected, onSelect }: { listing: Listing; selected: boolean; onSelect: (selected: boolean) => void }) {
  // Save lives on the card; selection is lifted so the bulk bar (Add to tour) can read it.
  // The prototype has no server to persist either to.
  const [saved, setSaved] = useState(listing.saved)
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <PropertyCard
      media={<img src={listing.photo} alt={`${listing.address1}, ${listing.address2}`} loading="lazy" />}
      cardOverlayProps={{
        topLeftComponent: (
          <div className={css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '[6px]' })}>
            <Pill pill={listing.headline} />
            {listing.openHouse && <Pill pill={listing.openHouse} />}
          </div>
        ),
        // `CardOverlay` is pointer-events:none and restores it only for :is(a,button)
        // descendants; Haven's Checkbox is an input inside a label, so re-enable it here.
        topRightComponent: (
          <span style={{ pointerEvents: 'auto' }}>
            <Checkbox checked={selected} onChange={(_e, next) => onSelect(next)} aria-label={`Select ${listing.address1}`} />
          </span>
        ),
        bottomLeftComponent: saved ? <Tag dataColor="gray">Saved</Tag> : undefined,
      }}
      description={
        <div className={css({ display: 'flex', alignItems: 'center', gap: '200' })}>
          <ActionButton label={`Hide ${listing.address1}`} onClick={() => setDismissed(true)}><IconTrash size={15} /></ActionButton>
          <ActionButton label={`Send ${listing.address1} to a client`}><IconShare /></ActionButton>
          <div className={css({ flex: '1' })} />
          <ActionButton label={saved ? `Unsave ${listing.address1}` : `Save ${listing.address1}`} onClick={() => setSaved(s => !s)}>
            <IconHeart size={16} filled={saved} />
          </ActionButton>
        </div>
      }
      price={listing.price}
      priceAddon={
        <div className={css({ ml: 'auto', minW: '0', display: 'flex', gap: '200', fontSize: '11px', lineHeight: '14px', whiteSpace: 'nowrap' })}>
          <span className={css({ fontWeight: 'bold', minW: '0', overflow: 'hidden', textOverflow: 'ellipsis' })}>{listing.status}</span>
          <span className={css({ flexShrink: '0', color: 'text.alternate' })}>| {listing.dom} DOM</span>
        </div>
      }
      propertyMeta={listing.meta}
      address1={`${listing.address1} ${listing.address2}`}
      footer={
        <div className={css({ display: 'flex', gap: '200', fontSize: '12px', color: 'text.alternate' })}>
          <span>{listing.secondary}</span>
          <span className={css({ ml: 'auto', textAlign: 'right' })}>{listing.propertyType}</span>
        </div>
      }
    />
  )
}

// Client activity, per the support article: views, saves, hidden homes, searches.
// Client activity (prototype extension), per the support article: views, saves, hidden homes,
// searches. A dated timeline on the left, the client's numbers and settings on the right.
const ACTIVITY: { Icon?: React.ElementType; day: number; text: string; when: string; body?: string }[] = [
  { day: 0, text: 'viewed 1428 Maple Heights Dr 3 times', when: '2 hrs ago' },
  { day: 1, text: 'saved 902 Orchard Ct', when: 'Yesterday' },
  { day: 1, text: 'hid 77 Birchwood Ln', when: 'Yesterday' },
  { day: 2, text: 'changed the saved search to 3+ beds', when: '2 days ago' },
  { day: 3, text: 'joined you on Realtor.com+!', when: '3 days ago', body: 'Engage your client by sharing listings!' },
]
const dayLabel = (back: number) => {
  if (back === 0) return 'TODAY'
  if (back === 1) return 'YESTERDAY'
  const d = new Date(); d.setDate(d.getDate() - back)
  return `${d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()} ${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}

function ClientActivityScreen({ mobile }: { mobile?: boolean }) {
  const card = vstack({ alignItems: 'stretch', gap: '300', p: '400', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '300', bg: 'bg.base' })
  const label = css({ m: '0', color: 'text.base', textTransform: 'uppercase' })
  const body = css({ m: '0', color: 'text.base' })
  const strong = (n: React.ReactNode) => <strong>{n}</strong>
  const mostViewed = [{ id: 'l1', views: 3 }, { id: 'l3', views: 2 }]
  return (
    <div
      data-tour="clienthead"
      className={css({ display: 'grid', gap: '600', alignItems: 'start', px: mobile ? '400' : '600', pt: '300', pb: '600', overflowY: 'auto', flex: '1', minH: '0' })}
      style={{ gridTemplateColumns: mobile ? '1fr' : 'minmax(0, 1fr) 360px' }}
    >
      <section aria-label="Client activity" className={vstack({ alignItems: 'stretch', gap: '500' })}>
        {[0, 1, 2, 3].map(day => {
          const rows = ACTIVITY.filter(a => a.day === day)
          return (
            <div key={day} className={vstack({ alignItems: 'stretch', gap: '300' })}>
              <h3 className={css({ m: '0', pb: '200', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base', color: 'text.base', fontWeight: 'normal' })} style={{ fontSize: 12 }}>{dayLabel(day)}</h3>
              {rows.length === 0 && <p className={css({ m: '0', color: 'text.alternate' })} style={{ fontSize: 13 }}>{day === 0 ? 'No activity yet' : 'No activity'}</p>}
              {rows.map((a, i) => (
                <div key={i} className={hstack({ gap: '300', alignItems: 'flex-start' })}>
                  <Initials initials={SAMPLE_CLIENT.initials} size={40} />
                  <div className={vstack({ alignItems: 'flex-start', gap: '[2px]', minW: '0' })}>
                    <p className={body} style={{ fontSize: 16, lineHeight: '22px' }}><strong>{ALEX_FIRST}</strong> {a.text}</p>
                    <p className={css({ m: '0', color: 'text.alternate' })} style={{ fontSize: 13 }}>{a.when}</p>
                    {a.body && <p className={cx(body, css({ pt: '200' }))} style={{ fontSize: 18, lineHeight: '24px' }}>{a.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </section>

      <aside aria-label="About this client" className={vstack({ alignItems: 'stretch', gap: '400' })}>
        <section className={card}>
          <h3 className={label} style={{ fontSize: 13, fontWeight: 400 }}>Statistics</h3>
          <p className={body} style={{ fontSize: 14, lineHeight: '24px' }}>
            Joined {strong('3 days')} ago, {strong(7)} property views, {strong(CLIENT_FEED.savedCount)} saved, {strong(CLIENT_FEED.tourRequestCount)} tour request, {strong(0)} tours
          </p>
        </section>
        <section className={card}>
          <h3 className={label} style={{ fontSize: 13, fontWeight: 400 }}>Client settings</h3>
          <p className={css({ m: '0', color: 'text.alternate' })} style={{ fontSize: 14 }}>Clients are in charge of their own notifications.</p>
          <p className={cx(body, css({ pt: '200' }))} style={{ fontSize: 14, fontWeight: 700 }}>{SAMPLE_CLIENT.name}</p>
          <p className={body} style={{ fontSize: 14, lineHeight: '22px' }}>Email alerts <strong>ON | Real time</strong><br />Push notifications <strong>ON | Daily</strong></p>
        </section>
        <section className={card}>
          <h3 className={label} style={{ fontSize: 13, fontWeight: 400 }}>Most viewed properties</h3>
          {mostViewed.map(m => {
            const l = listingById(m.id)
            return (
              <div key={m.id} className={hstack({ gap: '300', alignItems: 'center' })}>
                <img src={l.photo} alt="" className={css({ w: '[56px]', h: '[42px]', borderRadius: '200', objectFit: 'cover', flexShrink: '0' })} />
                <div className={css({ minW: '0' })}>
                  <p className={css({ m: '0', color: 'text.base', fontWeight: 'semibold' })} style={{ fontSize: 14 }}>{l.address1}</p>
                  <p className={css({ m: '0', color: 'text.alternate' })} style={{ fontSize: 13 }}>{m.views} views · {fmtPrice(l.price)}</p>
                </div>
              </div>
            )
          })}
        </section>
      </aside>
    </div>
  )
}

// Client header (prototype extension): sample tag and a one-line summary. Client
// activity is the dark action in the main header, as in the product; Chat lives in the
// Feed Members popover on the header title and in the rail. Tours are built from the
// feed: tick homes, then Add to tour in the bulk bar.
function ClientHeader() {
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '300' })}>
      <div className={hstack({ gap: '300', alignItems: 'center', flexWrap: 'wrap' })}>
        <span className={css({ display: 'flex', flexShrink: '0', whiteSpace: 'nowrap' })}><Tag dataColor="yellowSubtle">Sample client</Tag></span>
      </div>
      <SampleNotice>Alex is a sample client with sample data. Nothing you send or schedule reaches a real person.</SampleNotice>
    </div>
  )
}

// Sticks to the bottom of the feed once a home is ticked. Add to tour opens the tour dialog.
// On phones the bar floats at the top of the feed, clear of the Ask RealAssist™ AI button.
function BulkBar({ count, onAddToTour, onClear, top }: { count: number; onAddToTour: () => void; onClear: () => void; top?: boolean }) {
  return (
    <div
      data-tour="addtotour" role="region" aria-label="Actions for selected homes"
      className={hstack({
        ...(top
          ? { position: 'absolute', top: '300', left: '300', right: '300', justifyContent: 'space-between' }
          : { position: 'sticky', bottom: '400', alignSelf: 'center', mt: 'auto' }),
        gap: '300', px: '500', py: '300',
        bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: 'pill', boxShadow: 'float', zIndex: '[5]',
      })}
    >
      <p aria-live="polite" className={css({ m: '0', fontWeight: 'semibold', color: 'text.base', whiteSpace: 'nowrap' })} style={{ fontSize: 14 }}>
        {count} {count === 1 ? 'home' : 'homes'} selected
      </p>
      <Button styleType="Ghost" size="sm" onClick={onClear}>Clear</Button>
      <Button styleType="Primary" size="sm" startIcon={<IconCalendar size={16} />} onClick={onAddToTour}>Add to tour</Button>
    </div>
  )
}

// The "+ Add" tile after the saved searches: starts a new saved search in Search.
function AddSearchTile({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button" onClick={onClick} aria-label="Add a saved search"
      className={vstack({ justifyContent: 'center', gap: '200', flexShrink: '0', borderRadius: '300', border: 'none', bg: 'bg.alternate', color: 'text.base', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'semibold', _hover: { bg: 'gray.200' } })}
      style={{ fontSize: compact ? 12 : 14, width: compact ? 88 : 124, height: compact ? 88 : 124 }}
    >
      <IconPlus size={16} />
      Add
    </button>
  )
}

function ClientsScreen({ detailTab, onDetailTab, selected, onSelect, onAddToTour, onClear, onAddSearch, mobile }: {
  mobile?: boolean
  detailTab: DetailTab; onDetailTab: (t: DetailTab) => void
  selected: string[]; onSelect: (id: string, next: boolean) => void; onAddToTour: () => void; onClear: () => void
  onAddSearch: () => void
}) {
  const [pill, setPill] = useState(PILLS[0])
  const [view, setView] = useState<ClientsView>('grid')
  const activity = detailTab === 'activity'
  if (activity) return <ClientActivityScreen mobile={mobile} />

  const bulkBar = selected.length > 0 && <BulkBar count={selected.length} onAddToTour={onAddToTour} onClear={onClear} top={mobile} />
  const screen = (
    <div data-tour="clienthead" className={vstack({ alignItems: 'stretch', gap: '600', px: mobile ? '400' : '600', pt: '300', pb: '600', overflowY: 'auto', flex: mobile ? '1' : '[0 1 auto]', minH: '0' })}>
      <ClientHeader />

      {/* Everything under the client header; the mobile tour highlights it as one block. */}
      <div data-tour="feedbody" className={vstack({ alignItems: 'stretch', gap: '600', flexShrink: '0' })}>
      {/* Tiles: Saved & Tour requests + Saved Searches */}
      <div data-tour="feedtiles" className={css({ display: 'flex', gap: mobile ? '400' : '900', flexWrap: mobile ? 'nowrap' : 'wrap', alignSelf: mobile ? 'stretch' : 'flex-start', overflowX: mobile ? 'auto' : 'visible', flexShrink: '0' })}>
        <div className={vstack({ alignItems: 'stretch', gap: mobile ? '200' : '[14px]', flexShrink: '0' })}>
          <GroupHeading>Saved &amp; Tour requests</GroupHeading>
          <div className={hstack({ gap: mobile ? '300' : '500' })}>
            <CountTile compact={mobile} src={IMG.savedListings} count={CLIENT_FEED.savedCount} label="Saved listings" />
            <CountTile compact={mobile} src={IMG.tourRequests} count={CLIENT_FEED.tourRequestCount} label="Tour requests" />
          </div>
        </div>
        <div className={vstack({ alignItems: 'stretch', gap: mobile ? '200' : '[14px]', flexShrink: '0' })}>
          <GroupHeading>Saved Searches</GroupHeading>
          <div className={hstack({ gap: mobile ? '300' : '500' })}>
            <SavedSearchTile compact={mobile} src={IMG.savedSearch} name={CLIENT_FEED.savedSearch.name} sub={CLIENT_FEED.savedSearch.sub} />
            <AddSearchTile compact={mobile} onClick={onAddSearch} />
          </div>
        </div>
      </div>

      {(
        <>
          {/* Filter pills + sort + view toggle */}
          <div className={css({ display: 'flex', alignItems: 'center', gap: '300', flexWrap: mobile ? 'nowrap' : 'wrap', overflowX: mobile ? 'auto' : 'visible', flexShrink: '0' })}>
            {PILLS.map(p => (
              <span key={p} className={css({ display: 'flex', flexShrink: '0' })}>
                <Button styleType={pill === p ? 'Primary' : 'Tertiary'} size="sm" onClick={() => setPill(p)}>{p}</Button>
              </span>
            ))}
            <div className={css({ flex: '1' })} />
            <button
              aria-label="Sort" title="Sort"
              className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', w: '40px', h: '40px', flexShrink: '0', borderRadius: 'circle', border: 'none', bg: 'transparent', color: 'text.base', cursor: 'pointer', _hover: { bg: 'bg.alternate' } })}
            >
              <IconSort />
            </button>
            <ViewToggle view={view} onView={setView} />
          </div>

          <div className={css({ borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })} />

          {/* Alex's saved homes, grouped by when they were saved */}
          {LISTING_GROUPS.map((g, gi) => (
            <section key={g.label} data-tour={gi === 0 ? 'thisweek' : undefined} className={vstack({ alignItems: 'stretch', gap: '500' })}>
              <GroupHeading>{g.label}</GroupHeading>
              <div
                className={css({ display: 'grid', gap: '[20px]' })}
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(288px, 100%), 1fr))' }}
              >
                {g.ids.map((id, ii) => (
                  // The first card is where the Schedule a tour tour starts.
                  <div key={id} data-tour={gi === 0 && ii === 0 ? 'pickhomes' : undefined}>
                    <ListingCard listing={listingById(id)} selected={selected.includes(id)} onSelect={next => onSelect(id, next)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
      </div>

      {!mobile && bulkBar}
    </div>
  )
  return mobile ? (
    <div className={css({ position: 'relative', flex: '1', minH: '0', display: 'flex', flexDirection: 'column' })}>
      {screen}
      {bulkBar}
    </div>
  ) : screen
}

// ─── Tours screen (replaces the shell's stub) ─────────────────────────────────

function ToursScreen({ tour, routeShown, onRoute, onOptimize, onReorder }: {
  tour?: BookedTour; routeShown: boolean; onRoute: (on: boolean) => void; onOptimize: () => void; onReorder: (ids: string[]) => void
}) {
  const [layout, setLayout] = useState<'Vertical' | 'Horizontal'>('Vertical')
  const { containerRef, drag, handle } = useStopDrag(tour?.homes ?? [], onReorder)
  if (!tour) return <div className={css({ p: '600' })}><EmptyNote>No tour selected. Select homes in a client’s feed and choose Add to tour.</EmptyNote></div>
  const homes = tour.homes.map(listingById)
  const past = tour.when === 'past'
  const vertical = layout === 'Vertical'
  return (
    <div data-tour="tourdetail" className={vstack({ alignItems: 'stretch', gap: '0', flex: '1', minH: '0' })}>
      <div className={hstack({ gap: '300', px: '600', pt: '300', pb: '300', flexShrink: '0' })}>
        <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0' })} style={{ fontSize: 16 }}>{tour.date}</p>
        {tour.sample && <Tag dataColor="yellowSubtle">Sample client</Tag>}
        <div className={css({ flex: '1' })} />
        <div role="group" aria-label="Layout" data-tour="tourlayout" className={css({ display: 'inline-flex', bg: 'bg.alternate', borderRadius: 'pill', p: '200' })}>
          {(['Vertical', 'Horizontal'] as const).map(l => (
            <button
              key={l} type="button" onClick={() => setLayout(l)} aria-pressed={layout === l}
              className={css({
                px: '400', h: '32px', borderRadius: 'pill', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'semibold', color: 'text.base',
                bg: layout === l ? 'bg.base' : 'transparent', boxShadow: layout === l ? 'raised' : 'none',
              })}
              style={{ fontSize: 14 }}
            >{l}</button>
          ))}
        </div>
      </div>
      <div className={css({ display: 'flex', flexDirection: vertical ? 'column' : 'row', flex: '1', minH: '0' })}>
      <div className={vstack({ alignItems: 'stretch', gap: '0', minW: '0', minH: '0', flex: vertical ? 'none' : '1' })} style={vertical ? { maxHeight: '55%' } : undefined}>
      <div ref={containerRef} data-tour="tourlist" className={css({ overflow: 'auto', flex: '[0 1 auto]', minH: '0' })}>
        <Table spacing="compact" lines aria-label={`Homes on the tour with ${tour.client}`}>
          <Table.Header>
            <Table.Row>
              <Table.Cell>Move</Table.Cell>
              <Table.Cell>Order</Table.Cell>
              <Table.Cell>Status</Table.Cell>
              <Table.Cell>Address</Table.Cell>
              <Table.Cell>Time</Table.Cell>
              <Table.Cell>Tour status</Table.Cell>
              <Table.Cell>Notes</Table.Cell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {homes.map((h, i) => (
              <Table.Row key={h.id} data-stop-row="" style={drag === i ? { background: 'rgba(26,24,22,0.08)' } : undefined}>
                <Table.Cell><MoveHandle i={i} label={h.address1} handle={handle} /></Table.Cell>
                <Table.Cell>{String.fromCharCode(65 + i)}</Table.Cell>
                <Table.Cell>Active</Table.Cell>
                <Table.Cell>{h.address1}</Table.Cell>
                <Table.Cell>{stopTime(tour.time, i)}</Table.Cell>
                <Table.Cell><Tag dataColor={past ? 'graySubtle' : 'greenSubtle'}>{past ? 'Completed' : 'Confirmed'}</Tag></Table.Cell>
                <Table.Cell>{h.openHouse ? h.openHouse.text : '—'}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      <div className={hstack({ gap: '400', px: '600', py: '300', flexShrink: '0', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base' })}>
        <Link href="#">Add listing</Link>
        <Link href="#">Add a stop</Link>
        <div className={css({ flex: '1' })} />
        <TripPill stops={tour.homes} routeShown={routeShown} />
      </div>
      </div>
      <TourMap count={homes.length} order={tour.homes} route={routeShown} fill={!vertical}>
        <RouteButtons routeShown={routeShown} onRoute={onRoute} onOptimize={onOptimize} />
      </TourMap>
      </div>
    </div>
  )
}

// A stand-in street map with a lettered pin per stop. The product embeds a live map.
// "Open in": hands the tour's route to Google Maps or Apple Maps (the sample addresses aren't real places).
function OpenInMenu({ stops, open, onOpenChange, children }: { stops: string[]; open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  const addresses = stops.map(id => { const l = listingById(id); return `${l.address1}, ${l.address2}` })
  const go = (url: string) => { window.open(url, '_blank', 'noopener'); onOpenChange(false) }
  return (
    <Popover
      open={open} onClose={() => onOpenChange(false)} placement="bottom-end" offset={8} maxWidth="240px" header="Open in"
      body={
        <div className={vstack({ alignItems: 'stretch', gap: '100', mt: '200' })}>
          <Button styleType="Tertiary" size="sm" onClick={() => go(`https://www.google.com/maps/dir/${addresses.map(encodeURIComponent).join('/')}`)}>Google Maps</Button>
          <Button styleType="Tertiary" size="sm" onClick={() => go(`https://maps.apple.com/?saddr=${encodeURIComponent(addresses[0])}&daddr=${addresses.slice(1).map(encodeURIComponent).join('+to:')}`)}>Apple Maps</Button>
        </div>
      }
    >
      {children}
    </Popover>
  )
}

// Show route / Optimize, floating over the top corners of a tour's map.
function RouteButtons({ routeShown, onRoute, onOptimize }: { routeShown: boolean; onRoute: (on: boolean) => void; onOptimize: () => void }) {
  const pill = css({ position: 'absolute', zIndex: '[3]', top: '300', h: '[36px]', px: '400', borderRadius: 'pill', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'semibold', boxShadow: 'float' })
  return (
    <>
      <button type="button" data-tour="tourroute" className={pill} onClick={() => onRoute(!routeShown)}
        style={{ left: 12, background: '#2B2927', color: '#FFFFFF', fontSize: 14 }}>{routeShown ? 'Hide route' : 'Show route'}</button>
      <button type="button" data-tour="touroptimize" className={pill} onClick={onOptimize}
        style={{ right: 12, background: '#FFFFFF', color: '#2B2927', fontSize: 14 }}>Optimize</button>
    </>
  )
}

// Drive and walk time for the route; 0 until the route is shown.
function TripPill({ stops, routeShown }: { stops: string[]; routeShown: boolean }) {
  return (
    <span className={css({ display: 'inline-flex', bg: 'bg.alternate', borderRadius: 'pill', p: '100', whiteSpace: 'nowrap' })} style={{ fontSize: 13 }}>
      <span className={css({ px: '300', py: '100', borderRadius: 'pill', bg: 'bg.base', boxShadow: 'raised', fontWeight: 'semibold' })}>Drive {routeShown ? driveMins(stops) : 0} min</span>
      <span className={css({ px: '300', py: '100', color: 'text.alternate' })}>Walk {routeShown ? walkMins(stops) : 0} min</span>
    </span>
  )
}

const MAP_PINS = [{ x: 22, y: 30 }, { x: 56, y: 58 }, { x: 78, y: 28 }, { x: 40, y: 78 }]
// Where each listing sits on the stand-in map, so a stop keeps its place when the order changes.
const STOP_POS: Record<string, { x: number; y: number }> = { l1: MAP_PINS[0], l3: MAP_PINS[1], l4: MAP_PINS[2], l5: MAP_PINS[3] }
const pathLength = (ids: string[]) => ids.slice(1).reduce((n, id, i) => n + Math.hypot(STOP_POS[id].x - STOP_POS[ids[i]].x, STOP_POS[id].y - STOP_POS[ids[i]].y), 0)
// Quickest order through the stops (brute force; a tour has a handful of stops).
function quickestOrder(ids: string[]): string[] {
  if (ids.length < 3 || ids.length > 7) return ids
  const perms = (rest: string[]): string[][] => rest.length <= 1 ? [rest] : rest.flatMap((x, i) => perms([...rest.slice(0, i), ...rest.slice(i + 1)]).map(p => [x, ...p]))
  return perms(ids).reduce((best, p) => pathLength(p) < pathLength(best) ? p : best, ids)
}
// Stand-in drive and walk times, from the length of the route on the map.
const driveMins = (ids: string[]) => Math.max(1, Math.round(pathLength(ids) * 0.4))
const walkMins = (ids: string[]) => Math.max(1, Math.round(pathLength(ids) * 2.2))

function TourMap({ count, label = 'Map of the tour stops', fill, order, route, children }: {
  count: number; label?: string; fill?: boolean
  // A tour's stops in order (listing ids): pins are lettered by position, and `route` joins them.
  order?: string[]; route?: boolean; children?: React.ReactNode
}) {
  const pins = order ? order.map(id => STOP_POS[id]) : MAP_PINS.slice(0, count)
  return (
    <div role="img" aria-label={label} className={css({ position: 'relative', flex: '1', minH: fill ? '0' : '[160px]', bg: 'gray.100', overflow: 'hidden', color: 'gray.300' })}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {[12, 31, 47, 66, 84].map(y => <line key={`h${y}`} x1="0" x2="100" y1={y} y2={y + (y % 3) * 3 - 3} stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />)}
        {[8, 27, 44, 63, 81, 94].map(x => <line key={`v${x}`} y1="0" y2="100" x1={x} x2={x + (x % 4) * 3 - 4} stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />)}
        <path d="M0 90 C 30 60, 60 70, 100 20" fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {route && pins.length > 1 && (
          <polyline points={pins.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#D92228" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {pins.map((p, i) => (
        <span key={i} className={css({ position: 'absolute', w: '[28px]', h: '[28px]', ml: '[-14px]', mt: '[-14px]', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'circle', bg: 'text.base', color: 'bg.base', fontWeight: 'bold', boxShadow: 'float' })}
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: 13 }}>{String.fromCharCode(65 + i)}</span>
      ))}
      {children}
    </div>
  )
}

// ─── RealAssist™ AI panel ─────────────────────────────────────────────────────

// The circular send control. Transparent + muted when empty, brand-red + white
// (hover #B41C21) once there's something to send. Larger on the home composer.
function SendButton({ enabled, onClick, home }: { enabled: boolean; onClick: () => void; home: boolean }) {
  const size = home ? 40 : 36
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      aria-label="Send"
      className={css({
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
        borderRadius: 'circle', border: 'none', transition: '[background 120ms]',
        cursor: enabled ? 'pointer' : 'default',
        bg: enabled ? 'red.600' : 'transparent',
        color: enabled ? 'text.inverse' : 'text.alternate',
        _hover: enabled ? { bg: '[#B41C21]' } : {},
      })}
      style={{ width: size, height: size }}
    >
      {home ? <IconComposerSend size={18} /> : <IconSend size={15} />}
    </button>
  )
}

// The composer — a rounded field with the send circle bottom-right. Focus swaps the
// border to brand red and adds a soft ring (inline, since it's a dynamic value).
// The chat sheet reuses it with its own placeholder and label.
function Composer({ value, onChange, onSend, home, placeholder, label = 'Message RealAssist' }: {
  value: string; onChange: (v: string) => void; onSend: () => void; home: boolean; placeholder?: string; label?: string
}) {
  const [focused, setFocused] = useState(false)
  const enabled = !!value.trim()
  return (
    <div
      className={css({ display: 'flex', alignItems: 'flex-end', gap: '[8px]', flexShrink: '0', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderRadius: '[24px]', pt: '[5px]', pr: '[5px]', pb: '[5px]', pl: '[18px]' })}
      style={{ borderColor: focused ? '#D92228' : '#D3CFCA', boxShadow: focused ? '0 0 0 3px rgba(217,34,40,0.12)' : undefined }}
    >
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSend() }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder ?? (home ? 'How can I help you today?' : 'Ask about clients, tours, or listings')}
        aria-label={label}
        className={css({ flex: '[1 1 auto]', minW: '0', alignSelf: 'center', bg: 'transparent', border: 'none', outline: 'none', color: 'text.base', fontFamily: 'inherit', py: '200' })}
        style={{ fontSize: 14 }}
      />
      <SendButton enabled={enabled} onClick={onSend} home={home} />
    </div>
  )
}

// Transcript bubbles: user is a blue right-aligned bubble with a "Just now" stamp;
// AI is a bordered white left-aligned bubble. Radii/shadows match the reference.
// The last AI bubble is the "assistreply" tour target.
function Transcript({ msgs }: { msgs: Msg[] }) {
  const lastAi = msgs.map(m => m.role).lastIndexOf('ai')
  return (
    <div className={cx('ra-scroll', vstack({ alignItems: 'stretch', gap: '500', flex: '[1 1 auto]', overflowY: 'auto', px: '400', py: '500' }))}>
      {msgs.map((m, i) => m.role === 'user' ? (
        <div key={i} className={css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '100' })}>
          <div
            className={css({ bg: 'blue.100', color: 'text.base', fontWeight: 'medium' })}
            style={{ maxWidth: 'min(322px, 88%)', borderRadius: '16px 16px 0 16px', boxShadow: '0 1px 4px rgba(43,43,43,0.16)', padding: '12px 24px', fontSize: 14, lineHeight: '24px' }}
          >
            {m.text}
          </div>
          <span style={{ fontSize: 14, color: '#757575' }}>Just now</span>
        </div>
      ) : (
        <div key={i} className={css({ display: 'flex' })}>
          <div
            data-tour={i === lastAi ? 'assistreply' : undefined}
            className={css({ bg: 'bg.base', color: 'text.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'gray.200' })}
            style={{ maxWidth: '88%', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.55 }}
          >
            {m.text}
          </div>
        </div>
      ))}
    </div>
  )
}

// Launcher / home body — the composer leads at the top, then the terms line, then
// the capability grid. Content is centered in a max-width column (wider when expanded).
function AssistantLauncher({ onPick, input, onInput, onSend, expanded }: {
  onPick: (a: AssistAction) => void; input: string; onInput: (v: string) => void; onSend: () => void; expanded: boolean
}) {
  return (
    <div className={cx('ra-scroll', css({ flex: '[1 1 auto]', overflowY: 'auto', px: '400', py: '500' }))}>
      <div className={vstack({ alignItems: 'stretch', gap: '400', mx: 'auto' })} style={{ maxWidth: expanded ? '70%' : 720 }}>
        <Composer value={input} onChange={onInput} onSend={onSend} home />
        <p className={css({ textAlign: 'center', color: 'text.alternate', m: '0' })} style={{ fontSize: 12 }}>
          By using our AI, you agree to our <Link href="#">Terms</Link> &amp; <Link href="#">Privacy Policy</Link>.
        </p>
        <div data-tour="assistactions" className={css({ display: 'grid', gap: '400' })} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 288px), 1fr))' }}>
          {ASSIST_ACTIONS.map(a => (
            // Design-system Card — Card.Link (onClick) covers the whole tile for a11y +
            // click/hover; the icon, title, and description stack inside Card.Content.
            <Card key={a.id} className={css({ cursor: 'pointer' })}>
              <Card.Link onClick={() => onPick(a)} aria-label={a.title} />
              <Card.Content className={vstack({ alignItems: 'flex-start', gap: '300' })}>
                <a.Icon size={24} className={css({ color: 'text.base' })} />
                <Card.Title className={css({ fontWeight: 'semibold', color: 'text.base' })} style={{ fontFamily: DISPLAY_FONT, fontSize: 15 }}>{a.title}</Card.Title>
                <span className={css({ color: 'text.alternate' })} style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.desc}</span>
              </Card.Content>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// One thread row — title + timestamp, with visual-only Edit / Delete (no onClick).
function ThreadRow({ t }: { t: Thread }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '200', p: '300', borderRadius: '[12px]', _hover: { bg: 'gray.300' } })}>
      <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
        <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} style={{ fontSize: 12.5 }}>{t.title}</p>
        <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 11 }}>{t.when}</p>
      </div>
      <CircleButton size={28} hoverTone="iconHover" label={`Edit ${t.title}`}><IconPencil size={13} /></CircleButton>
      <CircleButton size={28} hoverTone="iconHover" label={`Delete ${t.title}`}><IconTrash size={13} /></CircleButton>
    </div>
  )
}

// The Threads list — rendered twice by the panel: as an inline dock (✕ header, when
// expanded) and as a sliding overlay (back-arrow header, when docked-narrow). Search
// is intentionally not rendered (Edit/Delete/Search are visual-only in the scaffold).
function ThreadsList({ threads, onClose, onNewChat, back = false, compact = false }: { threads: Thread[]; onClose: () => void; onNewChat: () => void; back?: boolean; compact?: boolean }) {
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '0', h: '100%', minW: '0' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '400', pt: '[16px]', pr: '[16px]', pb: '400', pl: '[20px]', flexShrink: '0' })}>
        {back && <CircleButton label="Back" hoverTone="border" onClick={onClose}><IconArrowLeft size={2} /></CircleButton>}
        <Heading compact={compact} className={css({ flex: '[1 1 auto]' })}>Threads</Heading>
        {!back && <CircleButton label="Close threads" hoverTone="border" onClick={onClose}><IconClose size={12} /></CircleButton>}
      </div>
      <div className={cx('ra-scroll', css({ flex: '[1 1 auto]', overflowY: 'auto', mx: '400', mb: '[16px]', display: 'flex', flexDirection: 'column', gap: '[2px]' }))}>
        <button
          onClick={onNewChat}
          className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '200', flexShrink: '0', h: '[36px]', px: '400', mb: '300', borderRadius: '[40px]', border: 'none', cursor: 'pointer', color: 'text.inverse', fontFamily: 'inherit', fontWeight: 'semibold', bg: '[#3F3B36]', _hover: { bg: '[#1A1816]' } })}
          style={{ fontSize: 14 }}
        >
          <IconCompose size={16} /> New thread
        </button>
        {threads.length === 0
          ? <EmptyNote>No threads match your search.</EmptyNote>
          : threads.map((t, i) => <ThreadRow key={i} t={t} />)}
      </div>
    </div>
  )
}

// The panel is absolutely positioned by the Shell; it animates width (0 → 420 →
// calc(100% − 64px) when expanded). `overflow: clip`, not hidden: a tour's scrollIntoView on the
// off-screen Threads overlay would otherwise scroll the panel sideways and leave it blank.
// Inside, the Threads history renders two ways:
// an inline dock (when expanded) and a sliding overlay (when docked-narrow).
function AssistantPanel({
  msgs, input, onInput, onSend, onPick, open, expanded, over, onToggleOver, onToggleExpand, onNewChat, onClose, mobile, panelPx = PANEL_PX, full,
}: {
  msgs: Msg[]; input: string; onInput: (v: string) => void; onSend: () => void; onPick: (a: AssistAction) => void
  open: boolean; expanded: boolean; over: boolean
  onToggleOver: () => void; onToggleExpand: () => void; onNewChat: () => void; onClose: () => void
  // Phones: full screen, with Threads sliding over it and no expand control.
  mobile?: boolean
  // Desktop: the panel's width (it narrows with the window), and `full` once the window is too
  // narrow to share the screen, when it fills everything right of the rail instead.
  panelPx?: number; full?: boolean
}) {
  const flat = mobile || full
  const width = !open ? '0px' : mobile ? '100%' : full || expanded ? 'calc(100% - 64px)' : `${panelPx}px`
  const dockW = !flat && over && expanded ? 300 : 0
  const overX = over && (flat || !expanded) ? 0 : 112
  const home = msgs.length === 0
  const dockedInHeader = !flat && expanded && over

  return (
    <aside
      aria-label="RealAssist AI"
      data-tour="assistpanel"
      aria-hidden={!open}
      className={css({ position: 'absolute', top: '0', right: '0', bottom: '0', zIndex: flat ? '[40]' : '[20]', bg: 'bg.alternate', borderLeftWidth: '100', borderLeftStyle: 'solid', borderColor: 'gray.200', overflow: 'clip', display: 'flex' })}
      style={{ width, visibility: open ? 'visible' : 'hidden', transition: `width 220ms ${EASE}` }}
    >
      {/* Inline dock — revealed left of the panel when expanded */}
      <div
        className={css({ flexShrink: '0', overflow: 'hidden', borderRightWidth: '100', borderRightStyle: 'solid', borderColor: 'border.base' })}
        style={{ width: dockW, background: '#F8F8F7', transition: `width 220ms ${EASE}` }}
        aria-hidden={!dockedInHeader}
        data-tour={flat ? undefined : 'threads'}
      >
        <div style={{ width: 300, height: '100%' }}>
          <ThreadsList threads={THREADS} onClose={onToggleOver} onNewChat={onNewChat} />
        </div>
      </div>

      {/* Main panel column */}
      <div className={css({ display: 'flex', flexDirection: 'column', flex: '[1 1 auto]', minW: '0', h: '100%', position: 'relative' })}>
        {/* Header — history toggle · centered wordmark · new-conversation / expand / close */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '200', px: '400', py: '400', flexShrink: '0' })}>
          {!dockedInHeader && (
            <span data-tour="threadsbtn" className={css({ display: 'flex' })}><Button styleType="Secondary" size="sm" iconOnly={<IconSubnav size={16} />} aria-label="Conversation history" onClick={onToggleOver} /></span>
          )}
          <div className={css({ flex: '[1 1 auto]', display: 'flex', justifyContent: 'center' })}>
            <img src="assets/logo-realassist-ai.svg" alt="RealAssist™ AI" className={css({ w: 'auto', display: 'block' })} style={{ height: 32 }} />
          </div>
          {!dockedInHeader && (
            <span data-tour="newchat" className={css({ display: 'flex' })}><CircleButton label="New conversation" onClick={onNewChat}><IconCompose size={16} /></CircleButton></span>
          )}
          {!flat && <span data-tour="expandpanel" className={css({ display: 'flex' })}>
            <CircleButton label={expanded ? 'Collapse panel' : 'Expand panel'} onClick={onToggleExpand}>
              {expanded ? <IconCollapsePanel size={14} /> : <IconExpandPanel size={14} />}
            </CircleButton>
          </span>}
          <span data-tour="closepanel" className={css({ display: 'flex' })}><CircleButton label="Close RealAssist" onClick={onClose}><IconClose size={12} /></CircleButton></span>
        </div>

        {/* Body — launcher (composer on top) until the first turn, then transcript + composer.
            Rendered only while open so tour targets never resolve inside a hidden panel. */}
        {open && (home ? (
          <AssistantLauncher onPick={onPick} input={input} onInput={onInput} onSend={onSend} expanded={expanded} />
        ) : (
          <>
            <Transcript msgs={msgs} />
            <div className={css({ px: '400', pb: '400', flexShrink: '0' })}>
              <Composer value={input} onChange={onInput} onSend={onSend} home={false} />
            </div>
          </>
        ))}

        {/* Sliding overlay — the Threads history over the panel when docked-narrow */}
        <div
          data-tour={flat ? 'threads' : undefined}
          className={css({ position: 'absolute', top: '0', right: '0', bottom: '0', left: '0', bg: 'bg.alternate' })}
          style={{ transform: `translateX(${overX}%)`, transition: `transform 220ms ${EASE}`, boxShadow: '-4px 0 16px rgba(26,24,22,0.12)' }}
        >
          <ThreadsList threads={THREADS} onClose={onToggleOver} onNewChat={onNewChat} back compact={mobile} />
        </div>
      </div>
    </aside>
  )
}

// ─── Chat window (prototype extension) ────────────────────────────────────────
// As in the product, a client chat opens in a floating window at the bottom right of
// the workspace (left of any docked panel), summoned from the rail's Chat cell or the
// Feed Members popover. Expand widens it.
const CHAT_W = 380
const CHAT_W_EXPANDED = 560

function ChatWindow({ open, right, expanded, onToggleExpand, onClose, mobile, ...body }: {
  mobile?: boolean
  open: boolean; right: number; expanded: boolean; onToggleExpand: () => void; onClose: () => void
  chat: ChatMsg[]; chipsUsed: string[]; onChip: (c: Chip) => void; onSend: (msg: ChatMsg, reply: string) => void
}) {
  if (!open) return null
  return (
    <section
      role="dialog" data-tour="chatwindow" aria-label={`Chat with ${SAMPLE_CLIENT.name}`}
      className={vstack(mobile
        ? { position: 'absolute', inset: '0', zIndex: '[40]', alignItems: 'stretch', gap: '0', bg: 'bg.base', overflow: 'hidden' }
        : { position: 'absolute', bottom: '600', zIndex: '[30]', alignItems: 'stretch', gap: '0', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'gray.200', borderRadius: '300', boxShadow: 'float', overflow: 'hidden' })}
      style={mobile ? undefined : { right, width: expanded ? CHAT_W_EXPANDED : CHAT_W, height: 'min(560px, calc(100vh - 120px))', transition: `width 220ms ${EASE}, right 220ms ${EASE}` }}
    >
      <div className={hstack({ gap: '200', px: '300', py: '300', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'gray.200', flexShrink: '0' })}>
        <CircleButton label="Back to chats" onClick={onClose}><IconArrowLeft size={2} /></CircleButton>
        <AvatarWithStatus name={SAMPLE_CLIENT.name} initials={SAMPLE_CLIENT.initials} online />
        <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
          <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0' })} style={{ fontSize: 14 }}>{SAMPLE_CLIENT.name}</p>
          <Link href="#" className={css({ color: 'text.alternate' })}>View details</Link>
        </div>
        <Tag dataColor="yellowSubtle">Sample</Tag>
        {!mobile && <CircleButton label={expanded ? 'Shrink chat' : 'Expand chat'} onClick={onToggleExpand}>
          {expanded ? <IconCollapsePanel size={14} /> : <IconExpandPanel size={14} />}
        </CircleButton>}
        <CircleButton label="Close chat" onClick={onClose}><IconClose size={12} /></CircleButton>
      </div>
      <div className={css({ px: '400', pt: '300', flexShrink: '0' })}>
        <SampleNotice>Alex is a sample client. Nothing you send reaches a real person.</SampleNotice>
      </div>
      <ChatThread {...body} />
    </section>
  )
}

function ChatThread({ chat, chipsUsed, onChip, onSend }: {
  chat: ChatMsg[]; chipsUsed: string[]; onChip: (c: Chip) => void; onSend: (msg: ChatMsg, reply: string) => void
}) {
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [chat.length])
  const chips = CHIPS.filter(c => !chipsUsed.includes(c.id))
  const sendText = () => {
    const t = text.trim()
    if (!t) return
    onSend({ from: 'agent', text: t }, 'Thanks, that sounds good.')
    setText('')
  }
  return (
    <>
      {/* Bubbles mirror the RealAssist™ transcript: the agent on the right, the client on the left. */}
      <div ref={scrollRef} data-tour="chatthread" aria-live="polite" aria-label={`Conversation with ${SAMPLE_CLIENT.name}`}
        className={cx('ra-scroll', vstack({ alignItems: 'stretch', gap: '400', flex: '[1 1 auto]', minH: '0', overflowY: 'auto', px: '400', py: '500' }))}>
        {chat.map((m, i) => {
          const mine = m.from === 'agent'
          const home = m.homeId ? listingById(m.homeId) : undefined
          return (
            <div key={i} className={css({ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' })}>
              <div
                className={css(mine
                  ? { bg: 'blue.100', color: 'text.base', fontWeight: 'medium' }
                  : { bg: 'bg.base', color: 'text.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'gray.200' })}
                style={mine
                  ? { maxWidth: 'min(322px, 88%)', borderRadius: '16px 16px 0 16px', boxShadow: '0 1px 4px rgba(43,43,43,0.16)', padding: '10px 18px', fontSize: 14, lineHeight: '22px' }
                  : { maxWidth: '88%', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.55 }}
              >
                {m.text.replace('{{first}}', AGENT.firstName)}
                {home && (
                  <div className={hstack({ gap: '300', mt: '200', p: '200', borderRadius: '200', bg: 'bg.base' })}>
                    <img src={home.photo} alt="" className={css({ w: '[56px]', h: '[42px]', borderRadius: '100', objectFit: 'cover', flexShrink: '0' })} />
                    <div className={vstack({ alignItems: 'flex-start', gap: '0', minW: '0' })}>
                      <span className={css({ fontWeight: 'semibold' })} style={{ fontSize: 13 }}>{fmtPrice(home.price)}</span>
                      <span className={css({ color: 'text.alternate' })} style={{ fontSize: 12 }}>{home.address1}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div data-tour="chatchips" className={vstack({ alignItems: 'stretch', gap: '300', px: '400', pb: '400', flexShrink: '0' })}>
        {chips.length > 0 && (
          <div className={wrap({ gap: '200' })}>
            {chips.map(c => <Button key={c.id} styleType="Tertiary" size="sm" onClick={() => onChip(c)}>{c.label}</Button>)}
          </div>
        )}
        <Composer value={text} onChange={setText} onSend={sendText} home={false} placeholder="Message…" label={`Message ${SAMPLE_CLIENT.name}`} />
      </div>
    </>
  )
}

// ─── Add to tour (prototype extension) ────────────────────────────────────────
// A Haven Modal opened from the bulk bar. First it offers the agent's existing tours and
// New tour; New tour moves to the client and date, then Create tour. `children` is where
// a running tour's coachmark mounts (see `ModalCoachmark`).
function TourModalView({
  mode, homes, tours, clients, draft, onNew, onBack, onClient, onDate, onAddTo, onCreate, onClose, children,
}: {
  mode: TourModal; homes: string[]; tours: BookedTour[]; clients: Client[]; draft: Workspace['draft']
  onNew: () => void; onBack: () => void; onClient: (id: string | null) => void; onDate: (d: Date | null) => void
  onAddTo: (tourId: string) => void; onCreate: () => void; onClose: () => void; children?: React.ReactNode
}) {
  const canCreate = !!draft.clientId && !!draft.date
  const n = homes.length
  const today = new Date()
  const legend = css({ fontWeight: 'semibold', color: 'text.base', mb: '300', p: '0' })
  return (
    <Modal open={mode !== 'closed'} onClose={onClose} width="min(560px, calc(100vw - 16px))" data-tour={mode === 'choose' ? 'tourdialog' : undefined}>
      <Modal.Header title={mode === 'new' ? 'New tour' : 'Add to tour'} />
      <Modal.Body>
        {mode === 'new' ? (
          <div className={vstack({ alignItems: 'stretch', gap: '600', py: '400' })}>
            <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 14 }}>
              {n} {n === 1 ? 'home' : 'homes'}: {homes.map(id => listingById(id).address1).join(' · ')}
            </p>
            <span data-tour="selectclient" className={css({ display: 'block' })}>
              <SelectInput
                id="tour-client" label="Client" value={draft.clientId ?? ''}
                options={[{ value: '', text: 'Select a client' }, ...clients.map(c => ({ value: c.id, text: c.id === SAMPLE_CLIENT.id ? `${c.name} (Sample client)` : c.name }))]}
                onChange={e => onClient(e.target.value || null)}
              />
            </span>
            {/* Inline calendar: the date is chosen inside the spotlight, not in a dropdown the tour would block. */}
            <fieldset data-tour="pickdate" className={vstack({ alignItems: 'stretch', gap: '0', border: 'none', m: '0', p: '0' })}>
              <legend className={legend} style={{ fontSize: 14 }}>Date</legend>
              <DatePicker id="tour-date" displayType="inline" width="100%" minDate={today} value={draft.date ?? undefined} onChange={d => onDate(d ?? null)} />
            </fieldset>
            <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 13 }}>Alex is a sample client, so no one gets a confirmation.</p>
          </div>
        ) : (
          <div className={vstack({ alignItems: 'stretch', gap: '500', py: '400' })}>
            <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 14 }}>
              Add {n} {n === 1 ? 'home' : 'homes'} to a tour you already have, or start a new one.
            </p>
            <span data-tour="createnewtour" className={css({ display: 'flex' })}>
              <Button styleType="Primary" size="sm" startIcon={<IconPlus size={16} />} onClick={onNew}>New tour</Button>
            </span>
            <div className={vstack({ alignItems: 'stretch', gap: '0', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '300' })}>
              {tours.length === 0 && <div className={css({ p: '400' })}><EmptyNote>You don’t have any tours yet.</EmptyNote></div>}
              {tours.map((t, i) => (
                <div key={t.id} className={hstack({ gap: '300', px: '400', py: '300', borderTopWidth: i ? '100' : '0', borderTopStyle: 'solid', borderColor: 'border.base' })}>
                  <div className={css({ flex: '1', minW: '0' })}>
                    <p className={css({ m: '0', fontWeight: 'semibold', color: 'text.base' })} style={{ fontSize: 14 }}>{t.client}</p>
                    <p className={css({ m: '0', color: 'text.alternate' })} style={{ fontSize: 13 }}>{t.date} · {t.homes.length} {t.homes.length === 1 ? 'home' : 'homes'}</p>
                  </div>
                  <Button styleType="Tertiary" size="sm" aria-label={`Add to tour with ${t.client} on ${t.date}`} onClick={() => onAddTo(t.id)}>Add</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {mode === 'new' && <Button styleType="Tertiary" size="sm" onClick={onBack}>Back</Button>}
        <div className={css({ flex: '1' })} />
        <Button styleType="Tertiary" size="sm" onClick={onClose}>Cancel</Button>
        {mode === 'new' && (
          <span data-tour="createbtn" className={css({ display: 'flex' })}>
            <Button styleType="Primary" size="sm" disabled={!canCreate} onClick={onCreate}>Create tour</Button>
          </span>
        )}
      </Modal.Footer>
      {children}
    </Modal>
  )
}

// A Haven Modal traps clicks and focus inside its layer, so while one is open the
// coachmark renders into the modal's portal target (Haven's slot for popovers that sit
// above a dialog) instead of the page. The dialog content can't host it: its transform
// would re-anchor the fixed-position spotlight.
// Radix marks that target aria-hidden and keeps focus inside the dialog, so the stop is
// also announced from a live region inside the dialog. The real controls stay reachable
// by keyboard, and Esc ends the tour.
function ModalCoachmark({ announce, children }: { announce: string; children: React.ReactNode }) {
  const target = usePortalTarget()
  return (
    <>
      <p aria-live="polite" className={css({ srOnly: true })}>{announce}</p>
      {/* One wrapper: the target forces pointer-events:auto on its direct children, which
          would make the spotlight cut-out swallow clicks meant for the dialog. */}
      {target && createPortal(<div>{children}</div>, target)}
    </>
  )
}

// ─── Invite client (prototype extension) ──────────────────────────────────────
// A Haven Modal, as in the product: client information (first name, last name, email,
// phone) with the text-consent line, then a public link for clients whose contact info
// the agent doesn't have, then bulk options. Spreadsheet upload and CRM connect are
// present but not part of the prototype. Sending an invite closes the modal.
// Bulk import (spreadsheet, CRM) is hidden until it's tested in a later sprint.
const SHOW_BULK_IMPORT = false
const BULK_NOTE = 'Bulk import isn’t part of this prototype. Try sending an invite.'
const EMPTY_INVITE = { first: '', last: '', email: '', mobile: '' }
// What "Show me" types in. Anything else the agent enters is treated as a real client.
const SAMPLE_INVITE = { first: 'Dana', last: 'Whitfield', email: 'dana.w@email.com', mobile: '(555) 010-0142' }
const PUBLIC_LINK = 'realtor.com/plus/join/georgia-booth'

function InviteModal({ open, demo, onInvite, onClose, children }: {
  open: boolean; demo: typeof EMPTY_INVITE | null; onInvite: (i: Invite) => void; onClose: () => void; children?: React.ReactNode
}) {
  const [f, setF] = useState(EMPTY_INVITE)
  const [tried, setTried] = useState(false)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  // Each open starts clean.
  useEffect(() => { if (open) { setF(EMPTY_INVITE); setTried(false); setNote(''); setCopied(false) } }, [open])
  // "Show me" fills the form with the sample client.
  useEffect(() => { if (demo) setF(demo) }, [demo])
  const emailOk = /\S+@\S+\.\S+/.test(f.email)
  const realClient = !!(f.first.trim() || f.last.trim() || f.email.trim() || f.mobile.trim()) && f.email.trim().toLowerCase() !== SAMPLE_INVITE.email
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(v => ({ ...v, [k]: e.target.value }))
  const send = () => {
    if (!f.first.trim() || !f.last.trim() || !emailOk) { setTried(true); return }
    onInvite({ id: `i${Date.now()}`, name: `${f.first.trim()} ${f.last.trim()}`, email: f.email.trim(), mobile: f.mobile.trim(), sample: !realClient })
  }
  const copy = () => { navigator.clipboard?.writeText(`https://${PUBLIC_LINK}`).catch(() => {}); setCopied(true) }
  const section = vstack({ alignItems: 'stretch', gap: '300', pt: '500', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })
  const sectionTitle = css({ fontWeight: 'semibold', color: 'text.base', m: '0' })
  return (
    <Modal open={open} onClose={onClose} width="min(560px, calc(100vw - 16px))">
      <Modal.Header title="Invite client" />
      <Modal.Body>
        <div data-tour="addbody" className={vstack({ alignItems: 'stretch', gap: '500', py: '400' })}>
          <section data-tour="inviteform" aria-label="Client information" className={vstack({ alignItems: 'stretch', gap: '400' })}>
            <h3 className={sectionTitle} style={{ fontSize: 16 }}>Client information</h3>
            <div className={grid({ columns: { base: 1, md: 2 }, gap: '400' })}>
              <TextInput label="First name" required autoComplete="off" value={f.first} onChange={set('first')}
                error={tried && !f.first.trim()} errorText="Enter a first name" />
              <TextInput label="Last name" required autoComplete="off" value={f.last} onChange={set('last')}
                error={tried && !f.last.trim()} errorText="Enter a last name" />
              <TextInput label="Email" type="email" required autoComplete="off" value={f.email} onChange={set('email')}
                error={tried && !emailOk} errorText="Enter an email, like name@email.com" />
              <TextInput label="Phone (recommended)" type="tel" autoComplete="off" value={f.mobile} onChange={set('mobile')}
                helperText="They’ll get a text too." />
            </div>
            <div aria-live="polite">
              {realClient && (
                <SampleNotice>
                  This isn’t sample data. Choosing Invite sends a real invitation to this client{f.mobile.trim() ? ', by email and text' : ''}.
                </SampleNotice>
              )}
            </div>
            <div className={hstack({ gap: '300', justifyContent: 'flex-end' })}>
              <Button styleType="Tertiary" size="sm" onClick={onClose}>Cancel</Button>
              <Button styleType="Primary" size="sm" onClick={send}>Invite</Button>
            </div>
            <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 12, lineHeight: '16px' }}>
              By choosing Invite, you confirm you have your client’s written consent for Realtor.com® to text them about Realtor.com+.
              They need a free realtor.com account to connect.
            </p>
          </section>

          <section aria-label="Share public link" className={section}>
            <h3 className={sectionTitle} style={{ fontSize: 16 }}>Share public link</h3>
            <p className={css({ color: 'text.base', m: '0' })} style={{ fontSize: 14 }}>
              Don’t have a client’s contact info? Anyone with your link can create a free realtor.com account and connect with you.
            </p>
            <div className={hstack({ gap: '300' })}>
              <Button styleType="Tertiary" size="sm" startIcon={<IconLink size={2} />} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
              <span className={css({ color: 'text.alternate' })} style={{ fontSize: 13 }}>{PUBLIC_LINK}</span>
            </div>
          </section>

          {SHOW_BULK_IMPORT && <section aria-label="Bring in your list" className={section}>
            <h3 className={sectionTitle} style={{ fontSize: 16 }}>Bring in your list</h3>
            <div className={wrap({ gap: '300' })}>
              <Button styleType="Tertiary" size="sm" startIcon={<IconUpload size={2} />} onClick={() => setNote(BULK_NOTE)}>Upload a spreadsheet</Button>
              <Button styleType="Tertiary" size="sm" startIcon={<IconSyncedCloud size={2} />} onClick={() => setNote(BULK_NOTE)}>Connect your CRM</Button>
            </div>
            <p aria-live="polite" className={css({ color: 'text.alternate', m: '0', _empty: { display: 'none' } })} style={{ fontSize: 13 }}>{note}</p>
          </section>}
        </div>
      </Modal.Body>
      {children}
    </Modal>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type Active = { id: TourId; i: number } | null

// ─── Phone layout ─────────────────────────────────────────────────────────────
// Under 768px the shell shows one pane at a time: a bottom nav replaces the rail, the
// Clients / Tours subnav is the whole screen, RealAssist™ AI and Chat open full screen,
// and Ask RealAssist™ AI is an icon-only button fixed at the bottom right.

const NAV_H = 64

function BottomNav({ route, chatOpen, onNavigate, onChat, onSupport }: {
  route: Route; chatOpen: boolean; onNavigate: (r: Route) => void; onChat: () => void; onSupport: () => void
}) {
  const cell = (key: string, label: string, icon: React.ReactNode, on: boolean, onClick: () => void, badge?: number) => (
    <button
      key={key} type="button" onClick={onClick} aria-current={on ? 'page' : undefined}
      className={css({ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '[2px]', border: 'none', bg: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: 'text.base', p: '0' })}
    >
      <span className={css({ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', w: '[44px]', h: '[32px]', borderRadius: '[10px]', bg: on ? 'gray.200' : 'transparent' })}>
        {icon}
        {badge ? (
          <span aria-hidden className={css({ position: 'absolute', top: '[-2px]', right: '[4px]', minW: '[16px]', h: '[16px]', px: '[4px]', borderRadius: 'pill', bg: '[#B41C21]', color: 'text.inverse', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' })} style={{ fontSize: 10 }}>{badge}</span>
        ) : null}
      </span>
      <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{label}</span>
    </button>
  )
  return (
    <nav
      aria-label="Main" data-tour="rail"
      className={css({ display: 'flex', flexShrink: '0', bg: 'bg.base', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'gray.200', px: '200' })}
      style={{ height: NAV_H, paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'content-box' }}
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => cell(id, label, <Icon size={20} />, route === id && !chatOpen, () => onNavigate(id)))}
      {cell('chat', 'Chat', <IconChat size={20} />, chatOpen, onChat, 2)}
      {cell('support', 'Support', <IconSupport size={20} />, false, onSupport)}
    </nav>
  )
}

// The agent's initials, far right in each phone header (the Account entry; inert here).
function MobileAccount() {
  return (
    <button type="button" onClick={openAccount} aria-label={`Account: ${AGENT.name}. Start over`} title={`${AGENT.name} · ${AGENT.brokerage}`}
      className={css({ display: 'flex', flexShrink: '0', p: '0', border: 'none', bg: 'transparent', cursor: 'pointer', borderRadius: 'circle' })}>
      <Initials initials={AGENT.initials} size={32} fontSize={12} />
    </button>
  )
}

// Icon-only Ask RealAssist™ AI, fixed bottom right above the nav.
function MobileFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" data-tour="askra" aria-label="Ask RealAssist AI" onClick={onClick}
      className={css({ position: 'absolute', right: '400', zIndex: '[30]', w: '[52px]', h: '[52px]', borderRadius: 'circle', border: 'none', cursor: 'pointer', color: 'text.inverse', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'float' })}
      style={{ bottom: NAV_H + 16, background: BRAND_GRADIENT_PILL }}
    >
      <IconRealAssist size={24} />
    </button>
  )
}

function MobileFeedHeader({ feed, activity, onBack, onActivity }: {
  feed: React.ReactNode; activity: boolean; onBack: () => void; onActivity: () => void
}) {
  return (
    <header className={hstack({ gap: '200', px: '300', py: '300', flexShrink: '0', bg: 'bg.base' })}>
      <CircleButton label={activity ? 'Back to feed' : 'Back to clients'} onClick={activity ? onActivity : onBack}><IconArrowLeft size={2} /></CircleButton>
      <div className={css({ flex: '1', minW: '0' })}>
        {activity ? (
          <h1 className={css({ m: '0', fontWeight: 'semibold', color: 'text.base', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
            style={{ fontFamily: DISPLAY_FONT, fontSize: 20, lineHeight: '26px', letterSpacing: '-0.02em' }}>{SAMPLE_CLIENT.name} - Client Activity</h1>
        ) : feed}
      </div>
      <span data-tour="activitytab" className={css({ display: 'flex' })}>
        <CircleButton label={activity ? 'View feed' : 'Client activity'} onClick={onActivity}>{activity ? <IconClients size={18} /> : <IconClientActivity size={18} />}</CircleButton>
      </span>
      <MobileAccount />
    </header>
  )
}

function MobileSearch() {
  const [list, setList] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '0', flex: '1', minH: '0', bg: 'bg.base' })}>
      <header className={hstack({ gap: '300', px: '300', pt: '300', pb: '200', flexShrink: '0' })}>
        <div className={css({ flex: '1', minW: '0' })}><SearchField flush placeholder="City, neighborhood, address, school…" ariaLabel="Search homes" /></div>
        <Button styleType="Ghost" size="sm">Save</Button>
        <MobileAccount />
      </header>
      <div className={css({ display: 'flex', gap: '200', px: '300', pb: '300', flexShrink: '0', overflowX: 'auto' })}>
        <Button styleType="Secondary" size="sm" startIcon={<IconSort />}>Filters</Button>
        <span className={css({ display: 'flex', '& button': { borderColor: '[#B41C21]', color: '[#B41C21]' } })}>
          <Button styleType="Secondary" size="sm" startIcon={<IconFlame size={16} />}>Hotsheet</Button>
        </span>
        {SEARCH_FILTERS.map(f => <span key={f} className={css({ display: 'flex', flexShrink: '0' })}><Button styleType="Secondary" size="sm">{f}</Button></span>)}
      </div>
      <div className={css({ position: 'relative', flex: '1', minH: '0', display: 'flex', flexDirection: 'column' })}>
        {list ? (
          <>
            <div className={vstack({ alignItems: 'stretch', gap: '400', flex: '1', minH: '0', overflowY: 'auto', px: '300', pt: '200', pb: '[120px]' })}>
              <p className={css({ m: '0', textAlign: 'center', fontWeight: 'bold', color: 'text.base' })} style={{ fontSize: 15 }}>30 listings</p>
              {LISTINGS.map(l => (
                <ListingCard key={l.id} listing={l} selected={picked.includes(l.id)}
                  onSelect={on => setPicked(p => on ? [...p, l.id] : p.filter(x => x !== l.id))} />
              ))}
            </div>
            <div className={css({ position: 'absolute', left: '0', right: '0', display: 'flex', justifyContent: 'center' })} style={{ bottom: 16 }}>
              <Button styleType="Primary" size="sm" onClick={() => setList(false)}>Map</Button>
            </div>
          </>
        ) : (
          <>
            <TourMap count={4} label="Map of homes for sale" fill />
            <button
              type="button" onClick={() => setList(true)}
              className={css({ position: 'absolute', left: '0', right: '0', bottom: '0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', bg: 'bg.base', color: 'text.base', borderTopLeftRadius: '[20px]', borderTopRightRadius: '[20px]', boxShadow: 'float', pt: '300', pb: '500', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '[2px]' })}
            >
              <span aria-hidden className={css({ w: '[40px]', h: '[4px]', borderRadius: 'pill', bg: 'gray.300', mb: '200' })} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>30 listings</span>
              <span className={css({ color: 'text.alternate' })} style={{ fontSize: 13 }}>View search stats</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Reordering a tour's stops by dragging a Move handle (touch or mouse) or with the arrow keys
// on a focused handle. Rows carry `data-stop-row`; the container holds them in order.
function useStopDrag(ids: string[], onReorder: (ids: string[]) => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)
  const idsRef = useRef(ids)
  idsRef.current = ids
  const move = (from: number, to: number) => {
    const cur = idsRef.current
    if (to < 0 || to >= cur.length || from === to) return
    const next = [...cur]
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x)
    onReorder(next)
  }
  useEffect(() => {
    if (drag === null) return
    const onMove = (e: PointerEvent) => {
      const rows = containerRef.current?.querySelectorAll('[data-stop-row]')
      const from = dragRef.current
      if (!rows?.length || from === null) return
      const first = rows[0].getBoundingClientRect()
      const to = Math.max(0, Math.min(idsRef.current.length - 1, Math.floor((e.clientY - first.top) / first.height)))
      if (to !== from) { move(from, to); dragRef.current = to; setDrag(to) }
    }
    const end = () => { dragRef.current = null; setDrag(null) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end) }
  }, [drag === null]) // eslint-disable-line react-hooks/exhaustive-deps
  const handle = (i: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); dragRef.current = i; setDrag(i) },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1) } else if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1) }
    },
    style: { touchAction: 'none' } as React.CSSProperties,
  })
  return { containerRef, drag, handle }
}

function MoveHandle({ i, label, handle }: { i: number; label: string; handle: ReturnType<typeof useStopDrag>['handle'] }) {
  return (
    <button
      type="button" aria-label={`Move ${label}. Drag, or use the up and down arrow keys.`} {...handle(i)}
      className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', w: '[32px]', h: '[40px]', border: 'none', bg: 'transparent', cursor: 'grab', color: 'text.alternate' })}
    >
      <IconDrag size={16} />
    </button>
  )
}

// A tour's stops as a list the agent can reorder (phones).
function StopRows({ ids, tourDate, onReorder }: { ids: string[]; tourDate: string; onReorder: (ids: string[]) => void }) {
  const { containerRef, drag, handle } = useStopDrag(ids, onReorder)
  const cols = '48px 48px 72px 40px 1fr'
  const head = css({ fontWeight: 'bold', color: 'text.base' })
  return (
    <div ref={containerRef} data-tour="tourlist" aria-label={`Stops for ${tourDate}`} className={css({ pb: '[96px]' })}>
      <div className={css({ display: 'grid', alignItems: 'center', px: '400', py: '300', gap: '0' })} style={{ gridTemplateColumns: cols, fontSize: 12 }} aria-hidden>
        <span className={head}>Move</span><span className={head}>Order</span><span className={head}>Status</span><span className={head}>D/S</span><span className={head}>Address</span>
      </div>
      <ul className={css({ listStyle: 'none', m: '0', p: '0' })}>
        {ids.map((id, i) => {
          const l = listingById(id)
          return (
            <li key={id} data-stop-row
              className={css({ display: 'grid', alignItems: 'center', px: '400', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base', bg: drag === i ? 'gray.200' : i % 2 === 0 ? 'bg.alternate' : 'bg.base' })}
              style={{ gridTemplateColumns: cols, height: 52, fontSize: 14 }}>
              <MoveHandle i={i} label={l.address1} handle={handle} />
              <span>{String.fromCharCode(65 + i)}</span>
              <span>Active</span>
              <span>—</span>
              <span className={css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{l.address1}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MobileTourDetail({ tour, pane, routeShown, mapsOpen, onMapsOpen, onCalendar, onPane, onRoute, onBack, onReorder, onOptimize }: {
  tour: BookedTour; pane: 'map' | 'list'; routeShown: boolean; mapsOpen: boolean
  onMapsOpen: (open: boolean) => void; onCalendar: () => void
  onPane: (p: 'map' | 'list') => void; onRoute: (on: boolean) => void; onBack: () => void
  onReorder: (ids: string[]) => void; onOptimize: () => void
}) {
  const [note, setNote] = useState('')
  const noteTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(noteTimer.current), [])
  const say = (text: string) => { setNote(text); window.clearTimeout(noteTimer.current); noteTimer.current = window.setTimeout(() => setNote(''), 3000) }
  const stops = tour.homes
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '0', flex: '1', minH: '0', bg: 'bg.base' })}>
      <header className={hstack({ gap: '200', px: '300', py: '300', flexShrink: '0', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base' })}>
        <CircleButton label="Back to tours" onClick={onBack}><IconArrowLeft size={2} /></CircleButton>
        <div className={css({ flex: '1', minW: '0' })}>
          <p className={css({ m: '0', fontWeight: 'bold', color: 'text.base', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} style={{ fontSize: 15 }}>{tour.client}</p>
          <p className={css({ m: '0', color: 'text.alternate' })} style={{ fontSize: 13 }}>{tour.date} {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'} | {tour.time}</p>
        </div>
        <Menu label="More actions" size={36} items={[{ label: 'Export' }, { label: 'Draft a text' }]} />
        <span data-tour="tourcalendar" className={css({ display: 'flex' })}>
          <CircleButton label="Add to calendar" onClick={() => { onCalendar(); say('Added to your calendar.') }}><IconCalendar size={18} /></CircleButton>
        </span>
        <span data-tour="tourmaps" className={css({ display: 'flex' })}>
          <OpenInMenu stops={stops} open={mapsOpen} onOpenChange={onMapsOpen}>
            <CircleButton label="Open in" pressed={mapsOpen} onClick={() => onMapsOpen(!mapsOpen)}><IconExport size={18} /></CircleButton>
          </OpenInMenu>
        </span>
        <MobileAccount />
      </header>
      {pane === 'map' && (
        <div className={hstack({ gap: '300', px: '400', py: '200', flexShrink: '0', justifyContent: 'space-between' })} style={{ fontSize: 14 }}>
          <span className={hstack({ gap: '300' })}><Link href="#">Add listing</Link><Link href="#">Add a stop</Link></span>
          <TripPill stops={stops} routeShown={routeShown} />
        </div>
      )}
      <div className={css({ position: 'relative', flex: '1', minH: '0', display: 'flex', flexDirection: 'column' })}>
        {pane === 'map' ? (
          <TourMap count={stops.length} order={stops} route={routeShown} fill>
            <RouteButtons routeShown={routeShown} onRoute={onRoute} onOptimize={onOptimize} />
          </TourMap>
        ) : (
          <div className={css({ flex: '1', minH: '0', overflowY: 'auto' })}><StopRows ids={stops} tourDate={tour.date} onReorder={onReorder} /></div>
        )}
        <div role="group" aria-label="Tour view" data-tour="tourswitch" className={css({ position: 'absolute', left: '50%', display: 'inline-flex', bg: 'bg.base', borderRadius: 'pill', p: '200', boxShadow: 'float' })} style={{ bottom: 16, transform: 'translateX(-50%)' }}>
          {(['map', 'list'] as const).map(p => (
            <button key={p} type="button" aria-pressed={pane === p} onClick={() => onPane(p)}
              className={css({ px: '500', h: '36px', borderRadius: 'pill', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'semibold', color: 'text.base', bg: pane === p ? 'gray.200' : 'transparent' })}
              style={{ fontSize: 15 }}>{p === 'map' ? 'Map' : 'List'}</button>
          ))}
        </div>
        {note && <p role="status" className={css({ position: 'absolute', left: '400', right: '400', top: '300', m: '0', zIndex: '[4]', px: '400', py: '300', bg: 'bg.inverse', color: 'text.inverse', borderRadius: '300', boxShadow: 'float' })} style={{ fontSize: 13 }}>{note}</p>}
      </div>
    </div>
  )
}

export default function Shell({ locked = false, dimDuringTours = true, listCorner = 'bottom-right' }: {
  locked?: boolean
  // Dev props for comparing treatments; not product controls.
  dimDuringTours?: boolean
  listCorner?: ListCorner
}) {
  const mobile = useIsMobile()
  const TB = mobile ? MOBILE_TOUR_BY_ID : TOUR_BY_ID
  const [saved] = useState(loadState)
  const [ws, setWs] = useState<Workspace>(() => ({ ...INITIAL_WS, ...saved?.ws }))
  const narrow = useIsNarrowDesktop()
  const vw = useViewportWidth()
  // The RealAssist panel narrows from 420px at 1024px to 320px at 924px, then fills the screen.
  const panelPx = Math.max(320, Math.min(PANEL_PX, vw - 604))
  const fullPanel = !mobile && vw <= 924
  const [inviteDemo, setInviteDemo] = useState<typeof EMPTY_INVITE | null>(null)
  const patch = useCallback((p: Partial<Workspace>) => setWs(s => ({ ...s, ...p })), [])
  const [input, setInput] = useState('')

  // ── Onboarding state ──
  const [welcome, setWelcome] = useState(() => !welcomeSeen())
  const [listOpen, setListOpen] = useState(saved?.listOpen ?? false)
  const [listGone, setListGone] = useState(saved?.listGone ?? false)
  const [done, setDone] = useState<Partial<Record<TourId, boolean>>>(saved?.done ?? {})
  const [active, setActive] = useState<Active>(null)
  const [base, setBase] = useState<Baseline>(() => baselineOf(INITIAL_WS))
  const [listFocus, setListFocus] = useState(0)
  // A short message when the tour list goes away, so the agent knows how to get it back.
  const [listNote, setListNote] = useState('')
  const noteTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(noteTimer.current), [])
  const flash = (note: string) => {
    setListNote(note)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setListNote(''), 3000)
  }
  const hideList = (note: string) => { setListGone(true); setListOpen(false); flash(note) }

  useEffect(() => { if (!welcome) markWelcomeSeen() }, [welcome])
  useEffect(() => { saveState(ws, done, listGone, listOpen) }, [ws, done, listGone, listOpen])

  // A message saved just before the page navigated away (see below) shows once on the next load.
  useEffect(() => {
    try {
      const note = sessionStorage.getItem(NOTE_KEY)
      if (!note) return
      sessionStorage.removeItem(NOTE_KEY)
      flash(note)
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Done on a tour's last step navigates to `?done=<tour>` (see telemetry.ts). This effect is declared
  // after the one above, so the finished tour is saved before the page leaves.
  const [pendingDone, setPendingDone] = useState<TourId | null>(null)
  useEffect(() => {
    if (!pendingDone) return
    flush(true)
    window.location.assign(doneUrl(pendingDone))
  }, [pendingDone])

  // Account → Start over: clear the saved session and reload to the welcome screen.
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    const open = () => setConfirmReset(true)
    window.addEventListener('wt:account', open)
    return () => window.removeEventListener('wt:account', open)
  }, [])
  const startOver = () => {
    track('start_over')
    flush(true)
    try { sessionStorage.removeItem(STATE_KEY) } catch { /* ignore */ }
    forgetWelcomeSeen()
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    window.location.reload()
  }
  useEffect(() => { savePrefs({ toursDone: done, listDismissed: listGone, welcomeSeen: !welcome }) }, [done, listGone, welcome])

  // ── Workspace actions ──
  const replyTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(replyTimer.current), [])
  const sendChat = useCallback((msg: ChatMsg, reply: string, chipId?: string) => {
    setWs(s => ({ ...s, chat: [...s.chat, msg], chipsUsed: chipId ? [...s.chipsUsed, chipId] : s.chipsUsed }))
    window.clearTimeout(replyTimer.current)
    replyTimer.current = window.setTimeout(() => setWs(s => ({ ...s, chat: [...s.chat, { from: 'client', text: reply }] })), 700)
  }, [])
  const sendChip = (c: Chip) => sendChat(c.msg, c.reply, c.id)
  // Picking a launcher action seeds a canned turn and flips the panel to the transcript.
  const pickAction = (a: AssistAction) => setWs(s => ({ ...s, assistMsgs: [...s.assistMsgs, { role: 'user', text: a.prompt }, { role: 'ai', text: a.reply }] }))
  function sendAssist() {
    const text = input.trim()
    if (!text) return
    // Canned stand-in — swap in your prototype's responder.
    setWs(s => ({ ...s, assistMsgs: [...s.assistMsgs, { role: 'user', text }, { role: 'ai', text: 'Got it. In a live prototype I’d act on that and show the result here.' }] }))
    setInput('')
  }
  const selectHome = (id: string, next: boolean) => setWs(s => ({ ...s, selected: next ? [...s.selected.filter(x => x !== id), id] : s.selected.filter(x => x !== id) }))
  // Creating a tour (or adding to one) clears the selection and lands on Tours.
  const finishTour = (s: Workspace, tours: BookedTour[], tourId: string): Workspace =>
    ({ ...s, tours, tourId, tourTab: 'Upcoming', tourView: 'list', selected: [], draft: { clientId: null, date: null }, tourModal: 'closed', route: 'tours' })
  const createTour = (force = false) => setWs(s => {
    const homes = s.selected.length ? s.selected : force ? ['l1', 'l3'] : []
    const clientId = s.draft.clientId ?? (force ? SAMPLE_CLIENT.id : null)
    const date = s.draft.date ?? (force ? nextSaturday() : null)
    const client = [SAMPLE_CLIENT, ...s.invites.map(i => ({ id: i.id, name: i.name }))].find(c => c.id === clientId)
    if (!homes.length || !client || !date) return s
    const id = `t${Date.now()}`
    return finishTour(s, [{ id, homes, client: client.name, sample: client.id === SAMPLE_CLIENT.id, date: fmtTourDate(date), time: '11:00 AM', when: 'upcoming' }, ...s.tours], id)
  })
  const addToTour = (tourId: string) => setWs(s =>
    finishTour(s, s.tours.map(t => t.id === tourId ? { ...t, homes: [...new Set([...t.homes, ...s.selected])] } : t), tourId))
  // Sending closes the modal and shows the Invited list, where the new client waits.
  const addInvite = (i: Invite) => setWs(s => ({ ...s, invites: [...s.invites, i], inviteOpen: false, clientTab: 'Invited' }))
  const openSheet = (sheet: Exclude<Sheet, null>) => patch({ sheet, expanded: false, over: false, feedMenuOpen: false })
  const openChat = () => patch({ chatOpen: true, feedMenuOpen: false })
  // Alex is the tour's client from the start; the select in the modal still lets the agent change it.
  const startNewTour = () => setWs(s => ({ ...s, tourModal: 'new', draft: { ...s.draft, clientId: s.draft.clientId ?? SAMPLE_CLIENT.id } }))
  const openTourModal = () => patch({ tourModal: 'choose', feedMenuOpen: false })
  const openInvite = () => patch({ inviteOpen: true, feedMenuOpen: false })
  const closeSheet = () => patch({ sheet: null, expanded: false, over: false })

  // Reordering a tour's stops, by hand or with Optimize.
  const setStops = (tourId: string, homes: string[]) => setWs(s => ({ ...s, tours: s.tours.map(t => t.id === tourId ? { ...t, homes } : t) }))
  const optimizeTour = () => {
    if (shownTour) setStops(shownTour.id, quickestOrder(shownTour.homes))
    setWs(s => ({ ...s, optimized: s.optimized + 1, routeShown: true }))
  }

  // "Show me": perform the stop's action on the agent's behalf.
  function doIt(c: Condition) {
    switch (c) {
      case 'feedMenuOpen': return patch({ feedMenuOpen: true })
      case 'chatOpen': return openChat()
      case 'chatSent': return sendChip(CHIPS.find(x => !ws.chipsUsed.includes(x.id)) ?? CHIPS[0])
      case 'homesPicked': return patch({ selected: ['l1', 'l3', 'l4'] })
      case 'addToTourOpen': return openTourModal()
      case 'newTourStarted': return startNewTour()
      case 'clientPicked': return setWs(s => ({ ...s, draft: { ...s.draft, clientId: SAMPLE_CLIENT.id } }))
      case 'tourOpened': return patch({ route: 'tours', tourView: 'detail' })
      case 'tourListShown': return patch({ tourPane: 'list' })
      case 'routeShown': return patch({ routeShown: true })
      case 'tourOptimized': return optimizeTour()
      case 'threadsOpen': return patch({ over: true })
      case 'calendarAdded': return patch({ calendarAdds: ws.calendarAdds + 1 })
      case 'mapsMenuOpen': return patch({ mapsMenuOpen: true })
      case 'assistNewChat': return newChat()
      case 'assistExpanded': return patch({ expanded: true, over: true })
      case 'assistCollapsed': return patch({ expanded: false, over: false })
      case 'datePicked': return setWs(s => ({ ...s, draft: { ...s.draft, date: nextSaturday() } }))
      case 'tourBooked': return createTour(true)
      case 'assistOpen': return openSheet('assist')
      case 'assistAsked': return pickAction(CATCH_UP)
      case 'addOpen': return openInvite()
      case 'invited': {
        // Fill the form first so the agent sees what an invite takes, then send it.
        if (inviteDemo) return
        patch({ inviteOpen: true })
        setInviteDemo(SAMPLE_INVITE)
        window.setTimeout(() => {
          addInvite({ id: `i${Date.now()}`, name: `${SAMPLE_INVITE.first} ${SAMPLE_INVITE.last}`, email: SAMPLE_INVITE.email, mobile: SAMPLE_INVITE.mobile, sample: true })
          setInviteDemo(null)
        }, 1400)
        return
      }
    }
  }

  // ── Session tracking (see telemetry.ts and tracking/README.md) ──
  useEffect(() => { setLayout(mobile ? 'mobile' : 'desktop') }, [mobile])
  useEffect(() => {
    if (locked) return
    // One session_start per browser tab; later loads (a reload, or the page load after Done) log page_load.
    let first = true
    try { first = !sessionStorage.getItem('rdcplus-wt:started'); sessionStorage.setItem('rdcplus-wt:started', '1') } catch { /* ignore */ }
    trackOnce(first ? 'session_start' : 'page_load', { referrer: document.referrer ? 'yes' : 'no' })
  }, [locked])
  type Move = 'start' | 'next' | 'back' | 'auto' | 'show_me'
  const pendingMove = useRef<Move>('start')
  // What happened on the step on screen, and across the tour, for step_exit and tour_complete.
  const trail = useRef({ enteredAt: 0, blocked: 0, showMe: false, hint: false })
  const run = useRef({ startedAt: 0, steps: 0, back: 0, showMe: 0, blocked: 0, stuck: 0, long: 0 })
  const stepInfo = (tourId: TourId, i: number) => {
    const t = TB[tourId]
    const st = t.stops[i]
    return { tour: tourId, step: i + 1, steps: t.stops.length, stepId: `${tourId}:${i + 1}:${st.target}`, title: st.title }
  }
  const leaveStep = (reason: string) => {
    if (!active) return
    const st = trail.current
    run.current.blocked += st.blocked
    track('step_exit', { ...stepInfo(active.id, active.i), reason, dwellMs: Date.now() - st.enteredAt, blocked: st.blocked, hint: st.hint, showMe: st.showMe })
  }
  const runTotals = () => ({ totalMs: Date.now() - run.current.startedAt, stepsViewed: run.current.steps, back: run.current.back, showMeClicks: run.current.showMe, blocked: run.current.blocked, stuck: run.current.stuck, longDwell: run.current.long })
  // Each step on screen: log the view, and flag a step the participant seems stuck on.
  useEffect(() => {
    if (!active) return
    const info = stepInfo(active.id, active.i)
    const st = TB[active.id].stops[active.i]
    trail.current = { enteredAt: Date.now(), blocked: 0, showMe: false, hint: !!(st.until && st.hint) }
    run.current.steps += 1
    track('step_view', { ...info, how: pendingMove.current, action: !!st.until })
    const flag = window.setTimeout(() => {
      if (st.until) { run.current.stuck += 1; track('stuck', { ...info, afterMs: 20000 }) }
      else { run.current.long += 1; track('long_dwell', { ...info, afterMs: 45000 }) }
    }, st.until ? 20000 : 45000)
    return () => window.clearTimeout(flag)
  }, [active?.id, active?.i]) // eslint-disable-line react-hooks/exhaustive-deps

  // A reload (or closing the tab) mid-tour: record where they were, since no tour_abandon will follow.
  const liveRef = useRef({ active, info: stepInfo })
  liveRef.current = { active, info: stepInfo }
  useEffect(() => {
    const onHide = () => {
      const { active: a, info } = liveRef.current
      if (!a) return
      track('tour_interrupted', { ...info(a.id, a.i), totalMs: Date.now() - run.current.startedAt })
      flush(true)
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

  // ── Tour engine ──
  function startTour(id: TourId, source: 'list' | 'welcome' = 'list') {
    const first = TB[id].stops[0]
    pendingMove.current = 'start'
    run.current = { startedAt: Date.now(), steps: 0, back: 0, showMe: 0, blocked: 0, stuck: 0, long: 0 }
    track('tour_start', { tour: id, source, steps: TB[id].stops.length })
    markTour('start', id)
    const view = mobile ? mobileViewFor(first.target) : null
    // Reset to a known state. Tours that need a fresh launcher or fresh quick replies
    // clear them so replays still have something to point at.
    const next: Workspace = {
      ...ws, ...TOUR_RESET, ...view, ...first.enter,
      ...(id === 'assist' ? { assistMsgs: [] } : null),
      ...(id === 'sample' ? { chipsUsed: [] } : null),
      // Replays start with no tours, as the New tour stop says.
      ...(id === 'schedule' ? { tours: [] } : null),
    }
    setWs(next)
    setBase(baselineOf(next))
    setWelcome(false)
    setListOpen(false)
    setListGone(false)
    setActive({ id, i: 0 })
  }
  const backedTo = useRef<string | null>(null)
  // The sample invite is only there to show the Invited list; a real one stays.
  const dropSampleInvites = useCallback(() => setWs(s => ({ ...s, invites: s.invites.filter(i => !i.sample) })), [])
  const goStop = useCallback((i: number, how: Move = 'next') => {
    if (!active) return
    const t = TB[active.id]
    pendingMove.current = how
    if (how === 'back') run.current.back += 1
    leaveStep(i >= t.stops.length ? 'complete' : how)
    if (i >= t.stops.length) {
      track('tour_complete', { tour: active.id, steps: t.stops.length, ...runTotals() })
      setDone(d => ({ ...d, [active.id]: true }))
      if (active.id === 'assist' || active.id === 'workspace') patch({ sheet: null, expanded: false, over: false })
      if (active.id === 'clients') dropSampleInvites()
      if (active.id === 'schedule') patch({ mapsMenuOpen: false })
      if (active.id === 'sample') patch({ chatOpen: false, chatExpanded: false })
      setActive(null)
      setPendingDone(active.id)
      if (TOURS.every(x => x.id === active.id || done[x.id])) {
        const note = `You’ve finished every tour. Choose Support in the ${mobile ? 'bottom bar' : 'left rail'} to replay any of them.`
        try { sessionStorage.setItem(NOTE_KEY, note) } catch { /* ignore */ }
        hideList(note)
        return
      }
      setListOpen(true)
      setListFocus(k => k + 1)
      return
    }
    const enter = t.stops[i].enter
    const phone = mobile ? mobileViewFor(t.stops[i].target) : null
    if (i < active.i) patch({ ...viewFor(t.stops[i].target, ws), ...phone, ...enter })
    else if (enter || phone) patch({ ...phone, ...enter })
    // Arriving by Back on an action stop whose condition is already met must not auto-advance.
    backedTo.current = i < active.i ? `${active.id}:${i}` : null
    setActive({ id: active.id, i })
  }, [active, patch, dropSampleInvites, ws, mobile, done])
  const endTour = useCallback(() => { if (active) { leaveStep('end'); track('tour_abandon', { ...stepInfo(active.id, active.i), ...runTotals() }); markTour('exit', active.id) } if (active?.id === 'assist' || active?.id === 'workspace') patch({ sheet: null, expanded: false, over: false }); if (active?.id === 'clients') dropSampleInvites(); if (active?.id === 'schedule') patch({ mapsMenuOpen: false }); if (active?.id === 'sample') patch({ chatOpen: false, chatExpanded: false }); setActive(null); setListOpen(true); setListFocus(k => k + 1) }, [active, patch, dropSampleInvites])
  const openTours = () => { track('list_open_support'); setActive(null); setListGone(false); setListNote(''); setListOpen(true); setListFocus(k => k + 1) }

  const stop = active ? TB[active.id].stops[active.i] : null
  const met = stop?.until ? isMet(stop.until, ws, base) : false
  // Action stops advance on their own once the real action happens.
  useEffect(() => {
    if (active && stop?.until && !stop.manual && met && backedTo.current !== `${active.id}:${active.i}`) goStop(active.i + 1, trail.current.showMe ? 'show_me' : 'auto')
  }, [active, stop, met, goStop])

  // On a narrow desktop the subnav and the RealAssist panel can't share the screen: opening one
  // collapses the other. If both are open when the window narrows, the subnav gives way.
  const lastPanes = useRef({ sheet: ws.sheet, subnav: ws.subnavOpen })
  useEffect(() => {
    const was = lastPanes.current
    lastPanes.current = { sheet: ws.sheet, subnav: ws.subnavOpen }
    if (!narrow || !ws.sheet || !ws.subnavOpen) return
    if (!was.subnav) patch({ sheet: null, expanded: false, over: false })
    else patch({ subnavOpen: false })
  }, [narrow, ws.sheet, ws.subnavOpen, patch])

  // Subnav only exists for Clients and Tours (Search is a full-bleed map).
  const subnavVariant = ws.route === 'clients' ? 'clients' : ws.route === 'tours' ? 'tours' : null
  const roster: Client[] = [
    SAMPLE_CLIENT,
    ...ws.invites.map(i => ({
      id: i.id, name: i.name, initials: initialsOf(i.name), budget: 'Not set', listings: 0,
      lastSeen: i.email, status: 'Invited' as const, sample: i.sample,
    })),
  ]
  const assistOpen = ws.sheet === 'assist'
  const sideOpen = !!ws.sheet

  const toggleOver = () => patch({ over: !ws.over })
  // Expanding reveals the inline Threads dock; collapsing hides it again.
  const toggleExpand = () => patch({ expanded: !ws.expanded, over: !ws.expanded })
  const newChat = () => setWs(s => ({ ...s, assistMsgs: [], over: false, newChats: s.newChats + 1 }))

  const coachmark = active && !locked ? (
    <Coachmark
      tour={TB[active.id]} index={active.i} dim={dimDuringTours} conditionMet={met}
      onNext={() => goStop(active.i + 1)} onBack={() => goStop(active.i - 1, 'back')} onEnd={endTour}
      onShowMe={() => {
        trail.current.showMe = true
        run.current.showMe += 1
        track('show_me', stepInfo(active.id, active.i))
        if (stop?.until) doIt(stop.until)
        if (stop?.manual) goStop(active.i + 1, 'show_me')
      }}
      onBlocked={() => { trail.current.blocked += 1 }}
      onTargetMissing={() => track('target_missing', stepInfo(active.id, active.i))}
    />
  ) : null

  // While a modal is open, the tour renders through it (see `ModalCoachmark`).
  const modalCoachmark = coachmark && stop && active ? (
    <ModalCoachmark announce={`${TB[active.id].title}, step ${active.i + 1} of ${TB[active.id].stops.length}: ${stop.title}. ${stop.body}${stop.hint ? ` ${stop.hint}.` : ''}`}>
      {coachmark}
    </ModalCoachmark>
  ) : null

  // The docked panels are absolutely positioned (they leave the flow); when one is open
  // and not expanded, the main column reserves its width so content isn't hidden under it.
  const dockedWidth = sideOpen && !(assistOpen && ws.expanded) && !fullPanel ? panelPx : 0
  const mainMarginRight = `${dockedWidth}px`
  // The tour list sits left of the chat window when it's open, so neither covers the other.
  const listOffset = dockedWidth + (ws.chatOpen ? (ws.chatExpanded ? CHAT_W_EXPANDED : CHAT_W) + 16 : 0)
  // The first tour in the tab is selected until the agent picks another.
  const tabTours = toursFor(ws.tours, ws.tourTab)
  const shownTour = tabTours.find(t => t.id === ws.tourId) ?? tabTours[0]
  const onActivityPage = ws.route === 'clients' && ws.detailTab === 'activity'
  const title = ws.route === 'clients' ? SAMPLE_CLIENT.name : ws.route === 'search' ? 'Search' : shownTour?.client ?? 'Tours'

  return (
    <div className={css({ position: 'relative', display: 'flex', alignItems: 'stretch', bg: 'bg.base', overflow: 'hidden' })} style={{ minWidth: 0, height: mobile ? '100dvh' : '100vh' }}>
      {mobile ? (
      <div className={css({ position: 'relative', display: 'flex', flexDirection: 'column', flex: '1', minW: '0', h: '100%' })}>
        <main className={css({ flex: '1', minH: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' })}>
          {ws.route === 'clients' && (ws.clientView === 'list' ? (
            <Subnav
              variant="clients" mobile shown activeId={SAMPLE_CLIENT.id} onClose={() => {}}
              tab={ws.clientTab} onTab={clientTab => patch({ clientTab })} clients={roster} tours={ws.tours}
              tourTab={ws.tourTab} onTourTab={tourTab => patch({ tourTab, tourId: null })} tourId={shownTour?.id}
              onPickTour={tourId => patch({ tourId })} onPickClient={() => patch({ clientView: 'feed' })} onInvite={openInvite}
            />
          ) : (
            <>
              <MobileFeedHeader
                feed={<FeedPopover open={ws.feedMenuOpen} onOpenChange={feedMenuOpen => patch({ feedMenuOpen })} onChat={openChat} />}
                activity={ws.detailTab === 'activity'} onBack={() => patch({ clientView: 'list', feedMenuOpen: false })}
                onActivity={() => patch({ detailTab: ws.detailTab === 'activity' ? 'homes' : 'activity' })}
              />
              <ClientsScreen mobile detailTab={ws.detailTab} onDetailTab={detailTab => patch({ detailTab })}
                selected={ws.selected} onSelect={selectHome} onAddToTour={openTourModal} onClear={() => patch({ selected: [] })}
                onAddSearch={() => patch({ route: 'search' })} />
            </>
          ))}
          {ws.route === 'search' && <MobileSearch />}
          {ws.route === 'tours' && (ws.tourView === 'list' || !shownTour ? (
            <Subnav
              variant="tours" mobile shown onClose={() => {}}
              tab={ws.clientTab} onTab={clientTab => patch({ clientTab })} clients={roster} tours={ws.tours}
              tourTab={ws.tourTab} onTourTab={tourTab => patch({ tourTab, tourId: null })} tourId={undefined}
              onPickTour={tourId => patch({ tourId, tourView: 'detail' })} onInvite={openInvite}
            />
          ) : (
            <MobileTourDetail
              tour={shownTour} pane={ws.tourPane} routeShown={ws.routeShown}
              mapsOpen={ws.mapsMenuOpen} onMapsOpen={mapsMenuOpen => patch({ mapsMenuOpen })} onCalendar={() => patch({ calendarAdds: ws.calendarAdds + 1 })}
              onPane={tourPane => patch({ tourPane })} onRoute={routeShown => patch({ routeShown })}
              onBack={() => patch({ tourView: 'list' })} onReorder={homes => setStops(shownTour.id, homes)} onOptimize={optimizeTour}
            />
          ))}
        </main>
        <BottomNav route={ws.route} chatOpen={ws.chatOpen} onNavigate={route => patch({ route, chatOpen: false, sheet: null })} onChat={openChat} onSupport={openTours} />
        {!ws.sheet && !ws.chatOpen && <MobileFab onClick={() => openSheet('assist')} />}
      </div>
      ) : (
        <>
      <NavRail active={ws.route} onNavigate={route => patch({ route })} onSupport={openTours} onChat={openChat} />

      {subnavVariant !== null && (
        <Subnav
          variant={subnavVariant} activeId={SAMPLE_CLIENT.id} shown={ws.subnavOpen} onClose={() => patch({ subnavOpen: false })}
          tab={ws.clientTab} onTab={clientTab => patch({ clientTab })} clients={roster} tours={ws.tours} tourTab={ws.tourTab} onTourTab={tourTab => patch({ tourTab, tourId: null })}
          tourId={shownTour?.id} onPickTour={tourId => patch({ tourId })} onInvite={openInvite}
        />
      )}

      {/* Main column */}
      <div className={vstack({ alignItems: 'stretch', gap: '0', flex: '1', minW: '0' })} style={{ marginRight: mainMarginRight, transition: `margin-right 220ms ${EASE}` }}>
        <MainHeader
          title={title}
          lead={ws.route === 'search' ? <div className={css({ w: '[340px]', flexShrink: '0' })}><SearchField flush placeholder="City, neighborhood, address, school…" ariaLabel="Search homes" /></div>
            : onActivityPage ? (
              <div className={hstack({ gap: '300', minW: '0', flex: '[1 1 0]' })}>
                <CircleButton label="Back to feed" onClick={() => patch({ detailTab: 'homes' })}><IconArrowLeft size={2} /></CircleButton>
                <h1 className={css({ m: '0', fontWeight: 'semibold', color: 'text.base', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
                  style={{ fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: '28px', letterSpacing: '-0.02em' }}>{SAMPLE_CLIENT.name} - Client Activity</h1>
              </div>
            ) : undefined}
          bare={ws.route === 'tours'}
          moreItems={ws.route === 'tours' ? [{ label: 'Export' }, { label: 'Draft a text' }] : undefined}
          items={ws.route === 'clients' ? FOLD_ITEMS.slice(0, 1) : undefined}
          secondary={ws.route === 'tours' ? (
            <span data-tour="tourmaps" className={css({ display: 'flex' })}>
              <OpenInMenu stops={shownTour?.homes ?? []} open={ws.mapsMenuOpen && !!shownTour} onOpenChange={mapsMenuOpen => patch({ mapsMenuOpen })}>
                <Button styleType="Secondary" size="sm" startIcon={<IconExport size={16} />} onClick={() => patch({ mapsMenuOpen: !ws.mapsMenuOpen })}>Open in</Button>
              </OpenInMenu>
            </span>
          )
            : onActivityPage ? (
              <span className={hstack({ gap: '300' })}>
                <Initials initials={SAMPLE_CLIENT.initials} size={36} fontSize={12} />
                <Button styleType="Secondary" size="sm" startIcon={<IconSearch size={16} />}>Edit searches</Button>
              </span>
            ) : undefined}
          below={ws.route === 'search' ? <SearchFilters /> : undefined}
          onAsk={() => openSheet('assist')}
          panelOpen={assistOpen}
          showSubnavButton={subnavVariant !== null && !ws.subnavOpen}
          subnavLabel={subnavVariant === 'clients' ? 'Clients' : 'Tours'}
          onOpenSubnav={() => patch({ subnavOpen: true })}
          feed={ws.route === 'clients' ? (
            <FeedPopover open={ws.feedMenuOpen} onOpenChange={feedMenuOpen => patch({ feedMenuOpen })} onChat={openChat} />
          ) : undefined}
          primary={ws.route === 'search' ? (
            <Button styleType="Primary" size="sm">Save search</Button>
          ) : ws.route === 'tours' ? (
            <span data-tour="tourcalendar" className={css({ display: 'flex' })}>
              <Button styleType="Primary" size="sm" startIcon={<IconCalendar size={16} />}
                onClick={() => { patch({ calendarAdds: ws.calendarAdds + 1 }); flash('Added to your calendar.') }}>Add to calendar</Button>
            </span>
          ) : ws.route === 'clients' ? (
            <span data-tour="activitytab" className={css({ display: 'flex' })}>
              <Button styleType="Primary" size="sm" startIcon={onActivityPage ? <IconClients size={16} /> : <IconClientActivity size={16} />}
                onClick={() => patch({ detailTab: onActivityPage ? 'homes' : 'activity' })}>{onActivityPage ? 'View feed' : 'Client activity'}</Button>
            </span>
          ) : undefined}
        />
        <main className={css({ display: 'flex', flexDirection: 'column', flex: '1', minH: '0' })}>
          {ws.route === 'clients' && (
            <ClientsScreen detailTab={ws.detailTab} onDetailTab={detailTab => patch({ detailTab })}
              selected={ws.selected} onSelect={selectHome} onAddToTour={openTourModal} onClear={() => patch({ selected: [] })}
              onAddSearch={() => patch({ route: 'search' })} />
          )}
          {ws.route === 'search' && <TourMap count={4} label="Map of homes for sale" fill />}
          {ws.route === 'tours' && <ToursScreen tour={shownTour} routeShown={ws.routeShown} onRoute={routeShown => patch({ routeShown })} onOptimize={optimizeTour}
            onReorder={homes => shownTour && setStops(shownTour.id, homes)} />}
        </main>
      </div>

        </>
      )}

      <AssistantPanel
        msgs={ws.assistMsgs}
        input={input}
        onInput={setInput}
        onSend={sendAssist}
        onPick={pickAction}
        open={assistOpen}
        expanded={ws.expanded}
        over={ws.over}
        onToggleOver={toggleOver}
        onToggleExpand={toggleExpand}
        onNewChat={newChat}
        onClose={closeSheet}
        mobile={mobile}
        panelPx={panelPx}
        full={fullPanel}
      />

      {!welcome && !listGone && !(mobile && (active || ws.sheet || ws.chatOpen)) && (
        <TourList
          tours={mobile ? MOBILE_TOURS : TOURS} mobile={mobile}
          lift={ws.route === 'search' ? 100 : ws.route === 'tours' && ws.tourView === 'detail' ? 60 : 0}
          expanded={listOpen && !active} done={done} corner={listCorner} sheetWidth={listOffset}
          focusKey={listFocus}
          onStart={id => startTour(id, 'list')} onMinimize={() => { track('list_minimize'); setListOpen(false) }} onExpand={() => { track('list_expand'); setActive(null); setListOpen(true) }}
          onDismiss={() => { track('list_dismiss'); hideList(`Tour list hidden. Choose Support in the ${mobile ? 'bottom bar' : 'left rail'} to see it again.`) }}
        />
      )}
      {listNote && (
        <p role="status" className={cx('wt-dark', css({ position: 'fixed', zIndex: '[900]', m: '0', display: 'flex', alignItems: 'center', gap: '200', pl: '400', pr: '200', py: '200', bg: 'bg.alternate', color: 'text.base', borderRadius: '300', boxShadow: 'float', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base' }))}
          style={mobile ? { left: 12, right: 12, bottom: 64 + 12, fontSize: 13 } : { right: 24, bottom: 24, maxWidth: 360, fontSize: 13 }}>
          <span className={css({ flex: '1' })}>{listNote}</span>
          <CircleButton label="Close message" size={28} color="#FFFFFF" onClick={() => setListNote('')}><IconClose size={12} /></CircleButton>
        </p>
      )}

      <ChatWindow mobile={mobile} open={ws.chatOpen} right={dockedWidth + 24} expanded={ws.chatExpanded}
        onToggleExpand={() => patch({ chatExpanded: !ws.chatExpanded })} onClose={() => patch({ chatOpen: false, chatExpanded: false })}
        chat={ws.chat} chipsUsed={ws.chipsUsed} onChip={sendChip} onSend={sendChat} />

      <TourModalView
        mode={locked ? 'closed' : ws.tourModal} homes={ws.selected} tours={toursFor(ws.tours, 'Upcoming')} clients={roster} draft={ws.draft}
        onNew={startNewTour} onBack={() => patch({ tourModal: 'choose' })}
        onClient={clientId => setWs(s => ({ ...s, draft: { ...s.draft, clientId } }))}
        onDate={date => setWs(s => ({ ...s, draft: { ...s.draft, date } }))}
        onAddTo={addToTour} onCreate={() => createTour()}
        onClose={() => patch({ tourModal: 'closed', draft: { clientId: null, date: null } })}>
        {ws.tourModal !== 'closed' && modalCoachmark}
      </TourModalView>
      <InviteModal open={ws.inviteOpen && !locked} demo={inviteDemo} onInvite={addInvite} onClose={() => patch({ inviteOpen: false })}>
        {ws.inviteOpen && modalCoachmark}
      </InviteModal>
      {ws.tourModal === 'closed' && !ws.inviteOpen && coachmark}

      <Modal open={confirmReset && !locked} onClose={() => setConfirmReset(false)} width="min(440px, calc(100vw - 16px))" data-wt-dark="">
        <Modal.Header title="Start over?" />
        <Modal.Body>
          <p className={css({ textStyle: 'bodyMd', color: 'text.alternate', py: '400' })}>
            This clears your progress and everything you did in the prototype, and takes you back to the welcome screen. Your first name stays.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <div className={css({ flex: '1' })} />
          <Button styleType="Tertiary" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button styleType="Primary" size="sm" onClick={startOver}>Start over</Button>
        </Modal.Footer>
      </Modal>
      <WelcomeDialog
        open={welcome && !locked} agent={agentProfile()}
        onExplore={() => { track('welcome_choice', { choice: 'explore' }); setWelcome(false); setListOpen(true) }}
        onTour={() => { track('welcome_choice', { choice: 'tour' }); startTour(TOURS[0].id, 'welcome') }}
      />
    </div>
  )
}
