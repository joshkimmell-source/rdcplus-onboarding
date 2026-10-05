import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Card,
  Checkbox,
  Link,
  Modal,
  Popover,
  PropertyCard,
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
  TOURS, TOUR_BY_ID,
  type ClientTab, type Condition, type DetailTab, type Route, type Sheet, type TourId,
} from './tours'
import { Coachmark } from './Coachmark'
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
//     Chat / Schedule tour) and a Client activity view that swaps in for the feed
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
const PANEL_WIDTH = '420px'
const PANEL_PX = 420

// ─── Sample data ──────────────────────────────────────────────────────────────

// Profile, license, and service area come from the agent's MLS sign-in.
const AGENT = { name: 'Georgia Booth', initials: 'GB', brokerage: 'Brightwater Realty Group' }
const AGENT_PROFILE: Agent = {
  ...AGENT, firstName: 'Georgia', license: 'SA.0712458', serviceArea: 'Maple Heights, Cedar Park, Lakeview',
}

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

// Client activity, per the support article: views, saves, hidden homes, searches.
const ACTIVITY: { Icon: React.ElementType; text: string; when: string }[] = [
  { Icon: IconHome, text: 'Viewed 1428 Maple Heights Dr 3 times', when: '2 hrs ago' },
  { Icon: IconHeart, text: 'Saved 902 Orchard Ct', when: 'Yesterday' },
  { Icon: IconTrash, text: 'Hid 77 Birchwood Ln', when: 'Yesterday' },
  { Icon: IconSearch, text: 'Changed saved search to 3+ beds', when: '2 days ago' },
  { Icon: IconUserPlus, text: 'Accepted your invite', when: '3 days ago' },
]

// Four preset tour times, always in the future: the next Saturday (morning and
// afternoon), the Sunday after, and the Tuesday after that.
function presetSlots(now = new Date()): string[] {
  const day = (offset: number, h: number, m: number) => {
    const d = new Date(now); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d
  }
  const toSat = ((6 - now.getDay() + 7) % 7) || 7
  const dates = [day(toSat, 10, 0), day(toSat, 13, 30), day(toSat + 1, 11, 0), day(toSat + 3, 17, 30)]
  return dates.map(d => `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
}
const SLOTS = presetSlots()

// ─── Sample-client chat ───────────────────────────────────────────────────────
type ChatMsg = { from: 'agent' | 'client'; text: string; homeId?: string }
const CHAT_OPENER: ChatMsg = { from: 'client', text: 'Hi Georgia, I’ve been saving homes around Maple Heights. Can you help me narrow it down?' }
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
  { id: 'add',    title: 'Add Client',          Icon: IconUserPlus,      desc: 'Guide agent through client onboarding with members, search, and notes', prompt: 'Help me add a new client.', reply: 'Clients join Realtor.com+ by invite. Choose Invite client above your client list, add their name and email, and I’ll help set up their search once they accept.' },
  { id: 'catch',  title: 'Catch Up',            Icon: IconCatchUp,       desc: 'Daily briefing that analyzes unread messages, notifications, and recent activity to suggest prioritized actions', prompt: 'Catch me up on my clients.', reply: 'Here’s your catch-up. Alex viewed 1428 Maple Heights Dr three times since yesterday and saved 902 Orchard Ct, which has an open house Saturday. Want to suggest a tour of both?' },
  { id: 'pulse',  title: 'Client Pulse',        Icon: IconChart,         desc: 'Analyze a client to get deeper insights, engagement patterns, member activity, and actionable suggestions', prompt: 'Show me Alex’s pulse.', reply: 'Alex is highly engaged: 23 home views this week, mostly 3–4 bed homes under $630K in Maple Heights. Weekday evenings are the best time to reach out.' },
  { id: 'search', title: 'Search Optimization', Icon: IconSearchSpark,   desc: 'Analyze client behavior to detect preferences and recommend search refinements', prompt: 'Optimize Alex’s search.', reply: 'Alex keeps saving homes with big yards and skips anything over $640K. Want me to tighten the saved search to $550K–$640K with a yard?' },
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

type Invite = { id: string; name: string; email: string; mobile: string }
type BookedTour = { id: string; homes: string[]; slot: string }

// ─── Workspace state ──────────────────────────────────────────────────────────

type Workspace = {
  route: Route; sheet: Sheet; detailTab: DetailTab; clientTab: ClientTab
  subnavOpen: boolean; expanded: boolean; over: boolean
  feedMenuOpen: boolean; chatOpen: boolean; chatExpanded: boolean; scheduleOpen: boolean; inviteOpen: boolean
  chat: ChatMsg[]; chipsUsed: string[]
  draft: { homes: string[]; slot: string | null }
  tours: BookedTour[]; invites: Invite[]; assistMsgs: Msg[]
}
const INITIAL_WS: Workspace = {
  route: 'clients', sheet: null, detailTab: 'homes', clientTab: 'Active',
  subnavOpen: true, expanded: false, over: false, feedMenuOpen: false, chatOpen: false, chatExpanded: false, scheduleOpen: false, inviteOpen: false,
  chat: [CHAT_OPENER], chipsUsed: [], draft: { homes: [], slot: null }, tours: [], invites: [], assistMsgs: [],
}
// The known state every tour starts from.
const TOUR_RESET: Partial<Workspace> = {
  route: 'clients', sheet: null, detailTab: 'homes', clientTab: 'Active',
  subnavOpen: true, expanded: false, over: false, feedMenuOpen: false, chatOpen: false, chatExpanded: false, scheduleOpen: false, inviteOpen: false, draft: { homes: [], slot: null },
}

type Baseline = { chat: number; tours: number; assist: number; invites: number }
const agentMsgs = (ws: Workspace) => ws.chat.filter(m => m.from === 'agent').length
const baselineOf = (ws: Workspace): Baseline => ({ chat: agentMsgs(ws), tours: ws.tours.length, assist: ws.assistMsgs.length, invites: ws.invites.length })

// Conditions mean "something new happened during this tour", against the baseline.
function isMet(c: Condition, ws: Workspace, b: Baseline) {
  switch (c) {
    case 'feedMenuOpen': return ws.feedMenuOpen
    case 'chatOpen': return ws.chatOpen
    case 'chatSent': return agentMsgs(ws) > b.chat
    case 'scheduleOpen': return ws.scheduleOpen
    case 'homesPicked': return ws.draft.homes.length > 0
    case 'slotPicked': return !!ws.draft.slot
    case 'tourBooked': return ws.tours.length > b.tours
    case 'assistOpen': return ws.sheet === 'assist'
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
function Heading({ as: Tag = 'h2', className, children }: { as?: React.ElementType; className?: string; children: React.ReactNode }) {
  return (
    <Tag
      className={cx(css({ m: '0', fontWeight: 'semibold', color: 'text.base' }), className)}
      style={{ fontFamily: DISPLAY_FONT, fontSize: 16, lineHeight: '20px', letterSpacing: '-0.01em' }}
    >
      {children}
    </Tag>
  )
}

// Pill-shaped search input with a leading magnifier (inert stand-in).
function SearchField({ placeholder, ariaLabel }: { placeholder: string; ariaLabel: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '300', flexShrink: '0', h: '[38px]', px: '[14px]', mx: '400', borderRadius: '[40px]', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', bg: 'bg.base' })}>
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
  if (plain) {
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

      {/* Account — inert in the scaffold */}
      <RailCell
        plain
        title={`${AGENT.name} · ${AGENT.brokerage}`}
        label="Account"
        icon={<Initials initials={AGENT.initials} size={30} fontSize={12} />}
      />
    </nav>
  )
}

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

function Subnav({ variant, activeId, shown, onClose, tab, onTab, clients, tours, onInvite }: {
  variant: 'clients' | 'tours'; activeId?: string; shown: boolean; onClose: () => void
  tab: ClientTab; onTab: (t: ClientTab) => void; clients: Client[]; tours: BookedTour[]; onInvite: () => void
}) {
  const title = variant === 'clients' ? 'Clients' : 'Tours'
  const rows = variant === 'clients' ? clients.filter(c => c.status === tab) : []
  const count = (t: ClientTab) => clients.filter(c => c.status === t).length

  // Animated collapse: the outer wrapper drives width 320↔0; the inner column
  // keeps its fixed 320 so its content doesn't reflow while it slides away.
  return (
    <div
      className={css({ flexShrink: '0', overflow: 'hidden' })}
      style={{ width: shown ? SUBNAV_WIDTH : '0px', transition: `width 220ms ${EASE}` }}
      aria-hidden={!shown}
      data-tour={variant === 'clients' ? 'clientlist' : undefined}
    >
      <div
        className={vstack({
          alignItems: 'stretch', gap: '400', h: '100%', bg: 'bg.alternate',
          borderRightWidth: '100', borderRightStyle: 'solid', borderColor: 'gray.200',
          overflowY: 'auto',
        })}
        style={{ width: SUBNAV_WIDTH }}
      >
        {/* Header */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '200', pt: '[18px]', pr: '400', pb: '400', pl: '[20px]' })}>
          <Heading className={css({ flex: '[1 1 auto]' })}>{title}</Heading>
          <Menu label="Sort and manage" hoverTone="border" items={[
            { label: 'Sort by name' }, { label: 'Sort by recent activity' },
            { separator: true }, { label: 'Manage clients' },
          ]} />
          {variant === 'clients' && (
            <span data-tour="addclient" className={css({ display: 'flex', borderRadius: 'circle' })}>
              <CircleButton label="Invite client" hoverTone="border" onClick={onInvite}><IconUserAddToProfile size={2} /></CircleButton>
            </span>
          )}
          <CircleButton label="Hide panel" hoverTone="border" onClick={onClose}><IconPanelClose size={16} /></CircleButton>
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
                    className={hstack({ gap: '300', alignItems: 'center', p: '300', borderRadius: '300', bg: selected ? 'gray.200' : 'transparent', _hover: { bg: 'gray.200' } })}
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
          <div className={vstack({ alignItems: 'stretch', gap: '[2px]', mx: '300' })}>
            {tours.map(t => {
              const first = listingById(t.homes[0])
              return (
                <div key={t.id} className={hstack({ gap: '300', alignItems: 'center', p: '300', borderRadius: '300', _hover: { bg: 'gray.200' } })}>
                  <img src={first.photo} alt="" className={css({ w: '[40px]', h: '[40px]', borderRadius: '200', objectFit: 'cover', flexShrink: '0' })} />
                  <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
                    <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} style={{ fontSize: 13.5 }}>
                      {t.homes.length > 1 ? `${first.address1} +${t.homes.length - 1}` : first.address1}
                    </p>
                    <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 11.5 }}>{SAMPLE_CLIENT.name} · {t.slot}</p>
                  </div>
                </div>
              )
            })}
            {tours.length === 0 && <EmptyNote>No tours yet. Start one from a client with Schedule tour.</EmptyNote>}
          </div>
        )}
      </div>
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
function ActionBar({ onAsk, panelOpen, primary }: { onAsk: () => void; panelOpen: boolean; primary?: React.ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null)
  // Number of collapsible pills (counted from the right — Favorites first) showing a label.
  const [labeled, setLabeled] = useState(FOLD_ITEMS.length)
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
    const reset = () => { setLabeled(FOLD_ITEMS.length); setMeasure(m => m + 1) }
    reset()
    document.fonts?.ready.then(reset)
    const row = rowRef.current
    if (!row) return
    const ro = new ResizeObserver(reset)
    ro.observe(row)
    return () => ro.disconnect()
  }, [panelOpen])

  const foldThreshold = FOLD_ITEMS.length - labeled // indices below this collapse to icons
  return (
    <div ref={rowRef} className={css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '300', flex: '[1 1 0]', minW: '0', overflow: 'hidden' })}>
      <Menu secondary label="More actions" items={[
        { label: 'Export list' }, { label: 'Print' },
        { separator: true }, { label: 'View settings' },
      ]} />
      {FOLD_ITEMS.map((it, i) => {
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
  title, onAsk, panelOpen, showSubnavButton, subnavLabel, onOpenSubnav, feed, primary,
}: {
  title: string; onAsk: () => void; panelOpen: boolean
  showSubnavButton?: boolean; subnavLabel?: string; onOpenSubnav?: () => void
  // On Clients the title is the client feed, which opens the feed popover.
  feed?: React.ReactNode
  primary?: React.ReactNode
}) {
  return (
    <header
      className={css({
        display: 'flex', alignItems: 'center', gap: '400',
        px: '600', py: '500', bg: 'bg.base', flexShrink: '0',
      })}
    >
      {/* Show-subnav control — appears only when the Clients/Tours subnav is collapsed */}
      {showSubnavButton && (
        <CircleButton size={32} label={subnavLabel ? `Show ${subnavLabel}` : 'Show panel'} onClick={onOpenSubnav}>
          <IconPanelOpen size={18} />
        </CircleButton>
      )}
      <div className={vstack({ alignItems: 'flex-start', gap: '[2px]', minW: '0', maxW: '45%' })}>
        {feed ?? <h1
          className={css({ m: '0', fontWeight: 'semibold', color: 'text.base', maxW: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
          style={{ fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: '28px', letterSpacing: '-0.02em' }}
        >{title}</h1>}
      </div>
      <ActionBar onAsk={onAsk} panelOpen={panelOpen} primary={primary} />
    </header>
  )
}

// ─── Clients screen (built out) ───────────────────────────────────────────────

// A 124px photo tile with a scrim and an overlaid count / label.
function CountTile({ src, count, label }: { src: string; count: number; label: string }) {
  return (
    <div className={css({ position: 'relative', w: '124px', h: '124px', flexShrink: '0', borderRadius: '300', overflow: 'hidden', boxShadow: 'raised', bg: 'bg.alternate' })}>
      <img src={src} alt="" loading="lazy" className={css({ position: 'absolute', inset: '0', w: '100%', h: '100%', objectFit: 'cover' })} />
      <div className={css({ position: 'absolute', inset: '0', pointerEvents: 'none' })} style={{ background: TILE_SCRIM }} />
      <div className={css({ position: 'absolute', left: '14px', bottom: '12px', color: 'white', pointerEvents: 'none' })}>
        <div className={css({ fontSize: '22px', fontWeight: 'bold', lineHeight: '26px' })}>{count}</div>
        <div className={css({ fontSize: '13px', fontWeight: 'semibold' })}>{label}</div>
      </div>
    </div>
  )
}

// The dark "Saved Searches" tile — two lines of copy over a deeper scrim.
function SavedSearchTile({ src, name, sub }: { src: string; name: string; sub: string }) {
  return (
    <div className={css({ position: 'relative', w: '124px', h: '124px', flexShrink: '0', borderRadius: '300', overflow: 'hidden', boxShadow: 'raised', bg: 'bg.inverse' })}>
      <img src={src} alt="" loading="lazy" className={css({ position: 'absolute', inset: '0', w: '100%', h: '100%', objectFit: 'cover' })} />
      <div className={css({ position: 'absolute', inset: '0', pointerEvents: 'none' })} style={{ background: TILE_SCRIM_DARK }} />
      <div className={css({ position: 'absolute', left: '14px', right: '14px', bottom: '12px', color: 'white', pointerEvents: 'none' })}>
        <div className={css({ fontSize: '14px', fontWeight: 'bold', lineHeight: '1.3' })}>{name}</div>
        <div className={css({ fontSize: '12px', fontWeight: 'medium', opacity: '0.85', mt: '100' })}>{sub}</div>
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

function ListingCard({ listing }: { listing: Listing }) {
  // Selection and save live on the card — nothing outside it reads them, and the
  // prototype has no server to persist a change to.
  const [selected, setSelected] = useState(false)
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
            <Checkbox checked={selected} onChange={(_e, next) => setSelected(next)} aria-label={`Select ${listing.address1}`} />
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

// Client header (prototype extension): sample tag, one-line summary, and Schedule tour.
// Client activity is the dark action in the main header, as in the product; Chat lives
// in the Feed Members popover on the header title and in the rail.
function ClientHeader({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div data-tour="clienthead" className={vstack({ alignItems: 'stretch', gap: '300' })}>
      <div className={hstack({ gap: '300', alignItems: 'center', flexWrap: 'wrap' })}>
        <span className={css({ display: 'flex', flexShrink: '0', whiteSpace: 'nowrap' })}><Tag dataColor="yellowSubtle">Sample client</Tag></span>
        <div className={css({ flex: '1' })} />
        <span data-tour="schedbtn" className={css({ display: 'flex' })}>
          <Button styleType="Primary" size="sm" startIcon={<IconCalendar size={16} />} onClick={onSchedule}>Schedule tour</Button>
        </span>
      </div>
      <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 14, lineHeight: '20px' }}>
        Budget {SAMPLE_CLIENT.budget} · Saved search: Maple Heights, 3+ bd · Next: reply to Alex’s message
      </p>
      <SampleNotice>Alex is a sample client with sample data. Nothing you send or schedule reaches a real person.</SampleNotice>
    </div>
  )
}

// The "+ Add" tile after the saved searches: starts a new saved search in Search.
function AddSearchTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} aria-label="Add a saved search"
      className={vstack({ justifyContent: 'center', gap: '200', w: '124px', h: '124px', flexShrink: '0', borderRadius: '300', border: 'none', bg: 'bg.alternate', color: 'text.base', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'semibold', _hover: { bg: 'gray.200' } })}
      style={{ fontSize: 14 }}
    >
      <IconPlus size={16} />
      Add
    </button>
  )
}

function ClientsScreen({ detailTab, onDetailTab, onSchedule, onAddSearch }: {
  detailTab: DetailTab; onDetailTab: (t: DetailTab) => void; onSchedule: () => void; onAddSearch: () => void
}) {
  const [pill, setPill] = useState(PILLS[0])
  const [view, setView] = useState<ClientsView>('grid')
  const activity = detailTab === 'activity'

  return (
    <div className={vstack({ alignItems: 'stretch', gap: '600', px: '600', pt: '300', pb: '600', overflowY: 'auto' })}>
      <ClientHeader onSchedule={onSchedule} />

      {/* Tiles: Saved & Tour requests + Saved Searches */}
      <div data-tour="feedtiles" className={css({ display: 'flex', gap: '900', flexWrap: 'wrap', alignSelf: 'flex-start' })}>
        <div className={vstack({ alignItems: 'stretch', gap: '[14px]' })}>
          <GroupHeading>Saved &amp; Tour requests</GroupHeading>
          <div className={hstack({ gap: '500' })}>
            <CountTile src={IMG.savedListings} count={CLIENT_FEED.savedCount} label="Saved listings" />
            <CountTile src={IMG.tourRequests} count={CLIENT_FEED.tourRequestCount} label="Tour requests" />
          </div>
        </div>
        <div className={vstack({ alignItems: 'stretch', gap: '[14px]' })}>
          <GroupHeading>Saved Searches</GroupHeading>
          <div className={hstack({ gap: '500' })}>
            <SavedSearchTile src={IMG.savedSearch} name={CLIENT_FEED.savedSearch.name} sub={CLIENT_FEED.savedSearch.sub} />
            <AddSearchTile onClick={onAddSearch} />
          </div>
        </div>
      </div>

      {activity ? (
        // Client activity log (prototype extension), newest first.
        <section aria-label="Client activity" className={vstack({ alignItems: 'stretch', gap: '500' })}>
          <div className={hstack({ gap: '300', justifyContent: 'space-between' })}>
            <GroupHeading>Client activity</GroupHeading>
            <Button styleType="Tertiary" size="sm" startIcon={<IconArrowLeft size={2} />} onClick={() => onDetailTab('homes')}>Back to feed</Button>
          </div>
          <ul className={css({ listStyle: 'none', m: '0', p: '0', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '300', bg: 'bg.base' })}>
            {ACTIVITY.map((a, i) => (
              <li key={i} className={hstack({ gap: '300', px: '400', py: '300', borderTopWidth: i ? '100' : '0', borderTopStyle: 'solid', borderColor: 'border.base' })}>
                <span className={css({ display: 'flex', color: 'text.alternate' })}><a.Icon size={16} /></span>
                <p className={css({ flex: '1', color: 'text.base', m: '0' })} style={{ fontSize: 14 }}>{a.text}</p>
                <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 12 }}>{a.when}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {/* Filter pills + sort + view toggle */}
          <div className={css({ display: 'flex', alignItems: 'center', gap: '300', flexWrap: 'wrap' })}>
            {PILLS.map(p => (
              <Button key={p} styleType={pill === p ? 'Primary' : 'Tertiary'} size="sm" onClick={() => setPill(p)}>{p}</Button>
            ))}
            <div className={css({ flex: '1' })} />
            <button
              aria-label="Sort" title="Sort"
              className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', w: '40px', h: '40px', flexShrink: '0', borderRadius: 'circle', border: 'none', bg: 'transparent', color: 'text.base', cursor: 'pointer', _hover: { bg: 'bg.alternate' } })}
            >
              <IconSort />
            </button>
            <div className={css({ display: 'inline-flex', bg: 'bg.alternate', borderRadius: 'pill', p: '200' })}>
              {VIEWS.map(({ id, label, Icon }) => {
                const on = view === id
                return (
                  <button
                    key={id}
                    onClick={() => setView(id)}
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
                {g.ids.map(id => (
                  <ListingCard key={id} listing={listingById(id)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Tours screen (replaces the shell's stub) ─────────────────────────────────

function ToursScreen({ tours }: { tours: BookedTour[] }) {
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '600', px: '600', pt: '300', pb: '600', overflowY: 'auto' })}>
      <section data-tour="tourslist" aria-label="Upcoming tours" className={vstack({ alignItems: 'stretch', gap: '500' })}>
        <GroupHeading>Upcoming</GroupHeading>
        {tours.length === 0 && <EmptyNote>No tours yet. Start one from a client with Schedule tour.</EmptyNote>}
        {[...tours].reverse().map(t => {
          const homes = t.homes.map(listingById)
          return (
            <Card key={t.id} bordered spacing="500">
              <Card.Content className={hstack({ gap: '500', alignItems: 'flex-start' })}>
                <img src={homes[0].photo} alt="" className={css({ w: '[112px]', h: '[84px]', borderRadius: '200', objectFit: 'cover', flexShrink: '0' })} />
                <div className={vstack({ alignItems: 'flex-start', gap: '200', flex: '1', minW: '0' })}>
                  <div className={wrap({ gap: '200' })}>
                    <Tag dataColor="greenSubtle">Scheduled</Tag>
                    <Tag dataColor="yellowSubtle">Sample client</Tag>
                  </div>
                  <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0' })} style={{ fontFamily: DISPLAY_FONT, fontSize: 16, lineHeight: '22px' }}>
                    {homes.length > 1 ? `${homes.length} homes with ${SAMPLE_CLIENT.name}` : homes[0].address1}
                  </p>
                  <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 13, lineHeight: '18px' }}>
                    {t.slot} · {homes.length > 1 ? homes.map(h => h.address1).join(' · ') : `With ${SAMPLE_CLIENT.name}`}
                  </p>
                  <div className={wrap({ gap: '200', pt: '100' })}>
                    <Button styleType="Secondary" size="sm" startIcon={<IconCalendar size={16} />}>Add to calendar</Button>
                    <Button styleType="Secondary" size="sm">Draft a text</Button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )
        })}
      </section>
    </div>
  )
}

// ─── Stubbed screens ──────────────────────────────────────────────────────────

function ScreenPlaceholder({ label }: { label: string }) {
  return (
    <div className={vstack({ alignItems: 'center', justifyContent: 'center', flex: '1', gap: '200', color: 'text.alternate' })}>
      <p className={css({ textStyle: 'bodyMd', fontWeight: 'medium' })}>{label}</p>
      <p className={css({ textStyle: 'bodySm', color: 'text.disabled' })}>Search isn’t part of this prototype (the real surface is a Leaflet map)</p>
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
function ThreadsList({ threads, onClose, onNewChat, back = false }: { threads: Thread[]; onClose: () => void; onNewChat: () => void; back?: boolean }) {
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '0', h: '100%', minW: '0' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '400', pt: '[16px]', pr: '[16px]', pb: '400', pl: '[20px]', flexShrink: '0' })}>
        {back && <CircleButton label="Back" hoverTone="border" onClick={onClose}><IconArrowLeft size={2} /></CircleButton>}
        <Heading className={css({ flex: '[1 1 auto]' })}>Threads</Heading>
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
// calc(100% − 64px) when expanded). Inside, the Threads history renders two ways:
// an inline dock (when expanded) and a sliding overlay (when docked-narrow).
function AssistantPanel({
  msgs, input, onInput, onSend, onPick, open, expanded, over, onToggleOver, onToggleExpand, onNewChat, onClose,
}: {
  msgs: Msg[]; input: string; onInput: (v: string) => void; onSend: () => void; onPick: (a: AssistAction) => void
  open: boolean; expanded: boolean; over: boolean
  onToggleOver: () => void; onToggleExpand: () => void; onNewChat: () => void; onClose: () => void
}) {
  const width = !open ? '0px' : expanded ? 'calc(100% - 64px)' : PANEL_WIDTH
  const dockW = over && expanded ? 300 : 0
  const overX = over && !expanded ? 0 : 112
  const home = msgs.length === 0
  const dockedInHeader = expanded && over

  return (
    <aside
      aria-label="RealAssist AI"
      aria-hidden={!open}
      className={css({ position: 'absolute', top: '0', right: '0', bottom: '0', zIndex: '[20]', bg: 'bg.alternate', borderLeftWidth: '100', borderLeftStyle: 'solid', borderColor: 'gray.200', overflow: 'hidden', display: 'flex' })}
      style={{ width, visibility: open ? 'visible' : 'hidden', transition: `width 220ms ${EASE}` }}
    >
      {/* Inline dock — revealed left of the panel when expanded */}
      <div
        className={css({ flexShrink: '0', overflow: 'hidden', borderRightWidth: '100', borderRightStyle: 'solid', borderColor: 'border.base' })}
        style={{ width: dockW, background: '#F8F8F7', transition: `width 220ms ${EASE}` }}
        aria-hidden={!dockedInHeader}
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
            <Button styleType="Secondary" size="sm" iconOnly={<IconSubnav size={16} />} aria-label="Conversation history" onClick={onToggleOver} />
          )}
          <div className={css({ flex: '[1 1 auto]', display: 'flex', justifyContent: 'center' })}>
            <img src="assets/logo-realassist-ai.svg" alt="RealAssist™ AI" className={css({ w: 'auto', display: 'block' })} style={{ height: 32 }} />
          </div>
          {!dockedInHeader && (
            <CircleButton label="New conversation" onClick={onNewChat}><IconCompose size={16} /></CircleButton>
          )}
          <CircleButton label={expanded ? 'Collapse panel' : 'Expand panel'} onClick={onToggleExpand}>
            {expanded ? <IconCollapsePanel size={14} /> : <IconExpandPanel size={14} />}
          </CircleButton>
          <CircleButton label="Close RealAssist" onClick={onClose}><IconClose size={12} /></CircleButton>
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
          className={css({ position: 'absolute', top: '0', right: '0', bottom: '0', left: '0', bg: 'bg.alternate' })}
          style={{ transform: `translateX(${overX}%)`, transition: `transform 220ms ${EASE}`, boxShadow: '-4px 0 16px rgba(26,24,22,0.12)' }}
        >
          <ThreadsList threads={THREADS} onClose={onToggleOver} onNewChat={onNewChat} back />
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

function ChatWindow({ open, right, expanded, onToggleExpand, onClose, ...body }: {
  open: boolean; right: number; expanded: boolean; onToggleExpand: () => void; onClose: () => void
  chat: ChatMsg[]; chipsUsed: string[]; onChip: (c: Chip) => void; onSend: (msg: ChatMsg, reply: string) => void
}) {
  if (!open) return null
  return (
    <section
      role="dialog" aria-label={`Chat with ${SAMPLE_CLIENT.name}`}
      className={vstack({ position: 'absolute', bottom: '600', zIndex: '[30]', alignItems: 'stretch', gap: '0', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'gray.200', borderRadius: '300', boxShadow: 'float', overflow: 'hidden' })}
      style={{ right, width: expanded ? CHAT_W_EXPANDED : CHAT_W, height: 'min(560px, calc(100vh - 120px))', transition: `width 220ms ${EASE}, right 220ms ${EASE}` }}
    >
      <div className={hstack({ gap: '200', px: '300', py: '300', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'gray.200', flexShrink: '0' })}>
        <CircleButton label="Back to chats" onClick={onClose}><IconArrowLeft size={2} /></CircleButton>
        <AvatarWithStatus name={SAMPLE_CLIENT.name} initials={SAMPLE_CLIENT.initials} online />
        <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
          <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0' })} style={{ fontSize: 14 }}>{SAMPLE_CLIENT.name}</p>
          <Link href="#" className={css({ color: 'text.alternate' })}>View details</Link>
        </div>
        <Tag dataColor="yellowSubtle">Sample</Tag>
        <CircleButton label={expanded ? 'Shrink chat' : 'Expand chat'} onClick={onToggleExpand}>
          {expanded ? <IconCollapsePanel size={14} /> : <IconExpandPanel size={14} />}
        </CircleButton>
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
                {m.text}
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

// ─── Schedule a tour (prototype extension) ────────────────────────────────────
// A Haven Modal, opened from Schedule tour on the client header. `children` is where a
// running tour's coachmark mounts (see `ModalCoachmark`).
function ScheduleModal({ open, draft, onToggleHome, onSlot, onBook, onClose, children }: {
  open: boolean; draft: Workspace['draft']; onToggleHome: (id: string) => void; onSlot: (s: string) => void
  onBook: () => void; onClose: () => void; children?: React.ReactNode
}) {
  const canBook = draft.homes.length > 0 && !!draft.slot
  const legend = css({ fontWeight: 'semibold', color: 'text.base', mb: '300', p: '0' })
  return (
    <Modal open={open} onClose={onClose} width="560px">
      <Modal.Header title="Schedule a tour" />
      <Modal.Body>
        <div className={vstack({ alignItems: 'stretch', gap: '600', py: '400' })}>
          <div className={hstack({ gap: '300' })}>
            <AvatarWithStatus name={SAMPLE_CLIENT.name} initials={SAMPLE_CLIENT.initials} />
            <p className={css({ flex: '1', fontWeight: 'semibold', color: 'text.base', m: '0' })} style={{ fontSize: 14 }}>{SAMPLE_CLIENT.name}</p>
            <Tag dataColor="yellowSubtle">Sample client</Tag>
          </div>
          <fieldset data-tour="pickhomes" className={vstack({ alignItems: 'stretch', gap: '0', border: 'none', m: '0', p: '0' })}>
            <legend className={legend} style={{ fontSize: 14 }}>Homes</legend>
            <div className={vstack({ alignItems: 'stretch', gap: '0', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '300' })}>
              {LISTINGS.map((l, i) => (
                <div key={l.id} className={css({ px: '400', py: '300', borderTopWidth: i ? '100' : '0', borderTopStyle: 'solid', borderColor: 'border.base' })}>
                  <Checkbox checked={draft.homes.includes(l.id)} onChange={() => onToggleHome(l.id)}>
                    {l.address1} <span className={css({ color: 'text.alternate' })}>· {fmtPrice(l.price)}</span>
                  </Checkbox>
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset data-tour="pickslot" className={vstack({ alignItems: 'stretch', gap: '0', border: 'none', m: '0', p: '0' })}>
            <legend className={legend} style={{ fontSize: 14 }}>Time</legend>
            <div className={grid({ columns: 2, gap: '200' })}>
              {SLOTS.map(sl => (
                <Button key={sl} styleType={draft.slot === sl ? 'Primary' : 'Tertiary'} size="sm" aria-pressed={draft.slot === sl} onClick={() => onSlot(sl)}>{sl}</Button>
              ))}
            </div>
          </fieldset>
          <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 13 }}>Alex is a sample client, so no one gets a confirmation.</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={css({ flex: '1' })} />
        <Button styleType="Tertiary" size="sm" onClick={onClose}>Cancel</Button>
        <span data-tour="bookbtn" className={css({ display: 'flex' })}>
          <Button styleType="Primary" size="sm" disabled={!canBook} onClick={onBook}>Schedule tour</Button>
        </span>
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
const BULK_NOTE = 'Bulk import isn’t part of this prototype. Try sending an invite.'
const EMPTY_INVITE = { first: '', last: '', email: '', mobile: '' }
const PUBLIC_LINK = 'realtor.com/plus/join/georgia-booth'

function InviteModal({ open, onInvite, onClose, children }: {
  open: boolean; onInvite: (i: Invite) => void; onClose: () => void; children?: React.ReactNode
}) {
  const [f, setF] = useState(EMPTY_INVITE)
  const [tried, setTried] = useState(false)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  // Each open starts clean.
  useEffect(() => { if (open) { setF(EMPTY_INVITE); setTried(false); setNote(''); setCopied(false) } }, [open])
  const emailOk = /\S+@\S+\.\S+/.test(f.email)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(v => ({ ...v, [k]: e.target.value }))
  const send = () => {
    if (!f.first.trim() || !f.last.trim() || !emailOk) { setTried(true); return }
    onInvite({ id: `i${Date.now()}`, name: `${f.first.trim()} ${f.last.trim()}`, email: f.email.trim(), mobile: f.mobile.trim() })
  }
  const copy = () => { navigator.clipboard?.writeText(`https://${PUBLIC_LINK}`).catch(() => {}); setCopied(true) }
  const section = vstack({ alignItems: 'stretch', gap: '300', pt: '500', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })
  const sectionTitle = css({ fontWeight: 'semibold', color: 'text.base', m: '0' })
  return (
    <Modal open={open} onClose={onClose} width="560px">
      <Modal.Header title="Invite client" />
      <Modal.Body>
        <div data-tour="addbody" className={vstack({ alignItems: 'stretch', gap: '500', py: '400' })}>
          <section data-tour="inviteform" aria-label="Client information" className={vstack({ alignItems: 'stretch', gap: '400' })}>
            <h3 className={sectionTitle} style={{ fontSize: 16 }}>Client information</h3>
            <div className={grid({ columns: 2, gap: '400' })}>
              <TextInput label="First name" required autoComplete="off" value={f.first} onChange={set('first')}
                error={tried && !f.first.trim()} errorText="Enter a first name" />
              <TextInput label="Last name" required autoComplete="off" value={f.last} onChange={set('last')}
                error={tried && !f.last.trim()} errorText="Enter a last name" />
              <TextInput label="Email" type="email" required autoComplete="off" value={f.email} onChange={set('email')}
                error={tried && !emailOk} errorText="Enter an email, like name@email.com" />
              <TextInput label="Phone (recommended)" type="tel" autoComplete="off" value={f.mobile} onChange={set('mobile')}
                helperText="They’ll get a text too." />
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

          <section aria-label="Bring in your list" className={section}>
            <h3 className={sectionTitle} style={{ fontSize: 16 }}>Bring in your list</h3>
            <div className={wrap({ gap: '300' })}>
              <Button styleType="Tertiary" size="sm" startIcon={<IconUpload size={2} />} onClick={() => setNote(BULK_NOTE)}>Upload a spreadsheet</Button>
              <Button styleType="Tertiary" size="sm" startIcon={<IconSyncedCloud size={2} />} onClick={() => setNote(BULK_NOTE)}>Connect your CRM</Button>
            </div>
            <p aria-live="polite" className={css({ color: 'text.alternate', m: '0', _empty: { display: 'none' } })} style={{ fontSize: 13 }}>{note}</p>
          </section>
        </div>
      </Modal.Body>
      {children}
    </Modal>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

type Active = { id: TourId; i: number } | null

export default function Shell({ locked = false, dimDuringTours = true, listCorner = 'bottom-right' }: {
  locked?: boolean
  // Dev props for comparing treatments; not product controls.
  dimDuringTours?: boolean
  listCorner?: ListCorner
}) {
  const [ws, setWs] = useState<Workspace>(INITIAL_WS)
  const patch = useCallback((p: Partial<Workspace>) => setWs(s => ({ ...s, ...p })), [])
  const [input, setInput] = useState('')

  // ── Onboarding state ──
  const [welcome, setWelcome] = useState(true)
  const [listOpen, setListOpen] = useState(false)
  const [listGone, setListGone] = useState(false)
  const [done, setDone] = useState<Partial<Record<TourId, boolean>>>({})
  const [active, setActive] = useState<Active>(null)
  const [base, setBase] = useState<Baseline>(() => baselineOf(INITIAL_WS))
  const [listFocus, setListFocus] = useState(0)

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
  const toggleHome = (id: string) => setWs(s => {
    const h = s.draft.homes
    return { ...s, draft: { ...s.draft, homes: h.includes(id) ? h.filter(x => x !== id) : [...h, id] } }
  })
  const book = (force = false) => setWs(s => {
    const d = force ? { homes: s.draft.homes.length ? s.draft.homes : ['l1', 'l3'], slot: s.draft.slot ?? SLOTS[0] } : s.draft
    if (!d.homes.length || !d.slot) return s
    return { ...s, tours: [...s.tours, { id: `t${Date.now()}`, homes: d.homes, slot: d.slot }], draft: { homes: [], slot: null }, scheduleOpen: false, route: 'tours' }
  })
  // Sending closes the modal and shows the Invited list, where the new client waits.
  const addInvite = (i: Invite) => setWs(s => ({ ...s, invites: [...s.invites, i], inviteOpen: false, clientTab: 'Invited' }))
  const openSheet = (sheet: Exclude<Sheet, null>) => patch({ sheet, expanded: false, over: false, feedMenuOpen: false })
  const openChat = () => patch({ chatOpen: true, feedMenuOpen: false })
  const openSchedule = () => patch({ scheduleOpen: true, feedMenuOpen: false })
  const openInvite = () => patch({ inviteOpen: true, feedMenuOpen: false })
  const closeSheet = () => patch({ sheet: null, expanded: false, over: false })

  // "Show me": perform the stop's action on the agent's behalf.
  function doIt(c: Condition) {
    switch (c) {
      case 'feedMenuOpen': return patch({ feedMenuOpen: true })
      case 'chatOpen': return openChat()
      case 'chatSent': return sendChip(CHIPS.find(x => !ws.chipsUsed.includes(x.id)) ?? CHIPS[0])
      case 'scheduleOpen': return openSchedule()
      case 'homesPicked': return setWs(s => ({ ...s, draft: { ...s.draft, homes: ['l1', 'l3'] } }))
      case 'slotPicked': return setWs(s => ({ ...s, draft: { ...s.draft, slot: SLOTS[0] } }))
      case 'tourBooked': return book(true)
      case 'assistOpen': return openSheet('assist')
      case 'assistAsked': return pickAction(CATCH_UP)
      case 'addOpen': return openInvite()
      case 'invited': return addInvite({ id: `i${Date.now()}`, name: 'Dana Whitfield', email: 'dana.w@email.com', mobile: '' })
    }
  }

  // ── Tour engine ──
  function startTour(id: TourId) {
    const first = TOUR_BY_ID[id].stops[0]
    // Reset to a known state. Tours that need a fresh launcher or fresh quick replies
    // clear them so replays still have something to point at.
    const next: Workspace = {
      ...ws, ...TOUR_RESET, ...first.enter,
      ...(id === 'assist' ? { assistMsgs: [] } : null),
      ...(id === 'sample' ? { chipsUsed: [] } : null),
    }
    setWs(next)
    setBase(baselineOf(next))
    setWelcome(false)
    setListOpen(false)
    setListGone(false)
    setActive({ id, i: 0 })
  }
  const goStop = useCallback((i: number) => {
    if (!active) return
    const t = TOUR_BY_ID[active.id]
    if (i >= t.stops.length) {
      setDone(d => ({ ...d, [active.id]: true }))
      setActive(null)
      setListOpen(true)
      setListFocus(k => k + 1)
      return
    }
    const enter = t.stops[i].enter
    if (enter) patch(enter)
    setActive({ id: active.id, i })
  }, [active, patch])
  const endTour = useCallback(() => { setActive(null); setListOpen(true); setListFocus(k => k + 1) }, [])
  const openTours = () => { setActive(null); setListGone(false); setListOpen(true); setListFocus(k => k + 1) }

  const stop = active ? TOUR_BY_ID[active.id].stops[active.i] : null
  const met = stop?.until ? isMet(stop.until, ws, base) : false
  // Action stops advance on their own once the real action happens.
  useEffect(() => {
    if (active && stop?.until && !stop.manual && met) goStop(active.i + 1)
  }, [active, stop, met, goStop])

  // Subnav only exists for Clients and Tours (Search is a full-bleed map).
  const subnavVariant = ws.route === 'clients' ? 'clients' : ws.route === 'tours' ? 'tours' : null
  const roster: Client[] = [
    SAMPLE_CLIENT,
    ...ws.invites.map(i => ({
      id: i.id, name: i.name, initials: initialsOf(i.name), budget: 'Not set', listings: 0,
      lastSeen: i.email, status: 'Invited' as const,
    })),
  ]
  const assistOpen = ws.sheet === 'assist'
  const sideOpen = !!ws.sheet

  const toggleOver = () => patch({ over: !ws.over })
  // Expanding reveals the inline Threads dock; collapsing hides it again.
  const toggleExpand = () => patch({ expanded: !ws.expanded, over: !ws.expanded })
  const newChat = () => patch({ assistMsgs: [], over: false })

  const coachmark = active && !locked ? (
    <Coachmark
      tour={TOUR_BY_ID[active.id]} index={active.i} dim={dimDuringTours} conditionMet={met}
      onNext={() => goStop(active.i + 1)} onBack={() => goStop(active.i - 1)} onEnd={endTour}
      onShowMe={() => { if (stop?.until) doIt(stop.until); if (stop?.manual) goStop(active.i + 1) }}
    />
  ) : null

  // While a modal is open, the tour renders through it (see `ModalCoachmark`).
  const modalCoachmark = coachmark && stop && active ? (
    <ModalCoachmark announce={`${TOUR_BY_ID[active.id].title}, step ${active.i + 1} of ${TOUR_BY_ID[active.id].stops.length}: ${stop.title}. ${stop.body}${stop.hint ? ` ${stop.hint}.` : ''}`}>
      {coachmark}
    </ModalCoachmark>
  ) : null

  // The docked panels are absolutely positioned (they leave the flow); when one is open
  // and not expanded, the main column reserves its width so content isn't hidden under it.
  const dockedWidth = sideOpen && !(assistOpen && ws.expanded) ? PANEL_PX : 0
  const mainMarginRight = `${dockedWidth}px`
  // The tour list sits left of the chat window when it's open, so neither covers the other.
  const listOffset = dockedWidth + (ws.chatOpen ? (ws.chatExpanded ? CHAT_W_EXPANDED : CHAT_W) + 16 : 0)
  const title = ws.route === 'clients' ? SAMPLE_CLIENT.name : ws.route === 'search' ? 'Search' : 'Tours'

  return (
    <div className={css({ position: 'relative', display: 'flex', alignItems: 'stretch', bg: 'bg.base', overflow: 'hidden' })} style={{ minWidth: '1024px', height: '100vh' }}>
      <NavRail active={ws.route} onNavigate={route => patch({ route })} onSupport={openTours} onChat={openChat} />

      {subnavVariant !== null && (
        <Subnav
          variant={subnavVariant} activeId={SAMPLE_CLIENT.id} shown={ws.subnavOpen} onClose={() => patch({ subnavOpen: false })}
          tab={ws.clientTab} onTab={clientTab => patch({ clientTab })} clients={roster} tours={ws.tours} onInvite={openInvite}
        />
      )}

      {/* Main column */}
      <div className={vstack({ alignItems: 'stretch', gap: '0', flex: '1', minW: '0' })} style={{ marginRight: mainMarginRight, transition: `margin-right 220ms ${EASE}` }}>
        <MainHeader
          title={title}
          onAsk={() => openSheet('assist')}
          panelOpen={assistOpen}
          showSubnavButton={subnavVariant !== null && !ws.subnavOpen}
          subnavLabel={subnavVariant === 'clients' ? 'Clients' : 'Tours'}
          onOpenSubnav={() => patch({ subnavOpen: true })}
          feed={ws.route === 'clients' ? (
            <FeedPopover open={ws.feedMenuOpen} onOpenChange={feedMenuOpen => patch({ feedMenuOpen })} onChat={openChat} />
          ) : undefined}
          primary={ws.route === 'clients' ? (
            <span data-tour="activitytab" className={css({ display: 'flex' })}>
              <Button styleType="Primary" size="sm" startIcon={<IconHeart size={16} />} aria-pressed={ws.detailTab === 'activity'}
                onClick={() => patch({ detailTab: ws.detailTab === 'activity' ? 'homes' : 'activity' })}>Client activity</Button>
            </span>
          ) : undefined}
        />
        <main className={css({ display: 'flex', flexDirection: 'column', flex: '1', minH: '0' })}>
          {ws.route === 'clients' && (
            <ClientsScreen detailTab={ws.detailTab} onDetailTab={detailTab => patch({ detailTab })}
              onSchedule={openSchedule} onAddSearch={() => patch({ route: 'search' })} />
          )}
          {ws.route === 'search' && <ScreenPlaceholder label="Search map" />}
          {ws.route === 'tours' && <ToursScreen tours={ws.tours} />}
        </main>
      </div>

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
      />

      {!welcome && !listGone && (
        <TourList
          expanded={listOpen && !active} done={done} corner={listCorner} sheetWidth={listOffset}
          focusKey={listFocus}
          onStart={startTour} onMinimize={() => setListOpen(false)} onExpand={() => { setActive(null); setListOpen(true) }}
          onDismiss={() => setListGone(true)}
        />
      )}

      <ChatWindow open={ws.chatOpen} right={dockedWidth + 24} expanded={ws.chatExpanded}
        onToggleExpand={() => patch({ chatExpanded: !ws.chatExpanded })} onClose={() => patch({ chatOpen: false, chatExpanded: false })}
        chat={ws.chat} chipsUsed={ws.chipsUsed} onChip={sendChip} onSend={sendChat} />

      <ScheduleModal open={ws.scheduleOpen && !locked} draft={ws.draft} onToggleHome={toggleHome}
        onSlot={slot => setWs(s => ({ ...s, draft: { ...s.draft, slot } }))} onBook={() => book()}
        onClose={() => patch({ scheduleOpen: false })}>
        {ws.scheduleOpen && modalCoachmark}
      </ScheduleModal>
      <InviteModal open={ws.inviteOpen && !locked} onInvite={addInvite} onClose={() => patch({ inviteOpen: false })}>
        {ws.inviteOpen && modalCoachmark}
      </InviteModal>
      {!ws.scheduleOpen && !ws.inviteOpen && coachmark}

      <WelcomeDialog
        open={welcome && !locked} agent={AGENT_PROFILE}
        onExplore={() => { setWelcome(false); setListOpen(true) }}
        onTour={() => startTour(TOURS[0].id)}
      />
    </div>
  )
}
