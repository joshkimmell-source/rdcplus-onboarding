import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Chip,
  DatePicker,
  Fieldset,
  Link,
  Modal,
  ProgressIndicator,
  PropertyCard,
  SelectInput,
  Tag,
  TextInput,
} from '@rdc-npm/rdc-ui-v4'
import {
  IconMoreFilled, IconArrowLeft, IconUserAddToProfile, IconChevronDown, IconChevronUp, IconCheck, IconCopy,
  IconClose as IconCloseHv,
} from '@rdc-npm/rdc-ui-v4/illustrations'
import {
  IconClients,
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
import { circle, grid, hstack, vstack, wrap } from 'styled-system/patterns'

// ─── What this shell is ───────────────────────────────────────────────────────
// RDC+ / RealAssist™ — the agent-facing "AI content orchestration" surface
// (realtor.com+, the Zenlist-derived agent app, reimagined on Haven). The chrome
// is a three-column workspace: a 64px NavRail, an optional 320px Subnav, the main
// screen, and a docked RealAssist™ AI assistant panel on the right. The Clients
// screen is built out as a client-detail workspace; Search and Tours are stubbed.
//
// Icons are a local custom SVG set (`./icons`) ported 1:1 from the reference
// design so the shell renders the exact geometry the spec calls for, rather than
// the nearest Haven `/illustrations` glyph. The one exception is the overflow
// menu, which stays Haven's `IconMoreFilled` — as in the reference, a ⋯ always
// means "open a menu", so the glyph is reused rather than re-drawn.
//
// Scaffold, not a replica: build one screen well, stub the rest, leave a comment
// where a designer extends. See shells/README.md.

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

// ─── Sample data ──────────────────────────────────────────────────────────────
// Replace / extend with your prototype's real content. 3–4 items is plenty.

const AGENT = { name: 'Georgia Booth', initials: 'GB', brokerage: 'Brightwater Realty Group' }

type Stage = 'Touring' | 'Nurture' | 'Offer out' | 'New client'
type Client = {
  id: string
  name: string
  initials: string
  budget: string
  listings: number
  lastSeen: string
  online?: boolean
  status: 'Active' | 'Invited' | 'Requests'
  stage: Stage
  sample?: boolean
}

// Onboarding: a brand-new agent's roster is just the sample client. Real clients
// join by invite (they create a free realtor.com account to connect), so invited
// clients sit under "Invited" until they sign up. RealAssist™ can't import clients.
// The sample client is demo-only: a scripted chat, and nothing is ever sent.
const SAMPLE_CLIENT: Client = {
  id: 'sample', name: 'Alex Rivera', initials: 'AR', budget: '$550K–$650K', listings: 1,
  lastSeen: 'Sample client', status: 'Active', stage: 'New client', sample: true,
}

const STAGE_COLOR: Record<Stage, 'blueSubtle' | 'graySubtle' | 'yellowSubtle' | 'greenSubtle'> = {
  Touring: 'blueSubtle', Nurture: 'graySubtle', 'Offer out': 'yellowSubtle', 'New client': 'greenSubtle',
}

function initialsOf(name: string) {
  return name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
}

const SUBNAV_TABS: Client['status'][] = ['Active', 'Invited', 'Requests']

// The Clients screen's three tiles.
const CLIENT_FEED = {
  savedCount: 12,
  tourRequestCount: 3,
  savedSearch: { name: 'Maple Heights, ST', sub: '$600K–$950K · 3+ bd' },
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
// The "Today" group of the client's saved / matched listings. Each record is a
// Haven `PropertyCard`: `meta` is Haven's snake_case `PropertyMeta` shape.
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

const LISTINGS: Listing[] = [
  {
    id: 'l1',
    photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop',
    price: 625000, status: 'NEW', dom: 0,
    address1: '1428 Maple Heights Dr', address2: 'Maple Heights, ST 00000',
    propertyType: 'Single Family Residence', secondary: '1 garage parking',
    meta: { beds: 4, baths_full: 2, baths_half: 1, sqft: 1835 },
    headline: { text: 'New 5 hrs ago', kind: 'new' }, openHouse: null, saved: true,
  },
  {
    id: 'l2',
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
    price: 1160000, status: 'PRICE CHANGE', dom: 42,
    address1: '77 Birchwood Ln', address2: 'Maple Heights, ST 00000',
    propertyType: 'Single Family Residence', secondary: '2 garage parking',
    meta: { beds: 5, baths_full: 3, baths_half: 1, sqft: 3120 },
    headline: { text: '$1.19M $1.16M', kind: 'priceDrop' }, openHouse: null, saved: false,
  },
  // ▼ Two representative cards — a "new/saved" and a "price change" — are enough to show
  //   the PropertyCard composition. Add more listings (with `openHouse` pills, other
  //   statuses) and more day-groups as your prototype needs them. ▼
]

// ─── RealAssist™ AI launcher actions ──────────────────────────────────────────
// The panel opens on this capability menu (before any turn). Each card seeds a
// canned turn and flips the panel to the transcript. Swap in real actions.
type AssistAction = { id: string; title: string; desc: string; Icon: React.ElementType; prompt: string }
const ASSIST_ACTIONS: AssistAction[] = [
  { id: 'add',    title: 'Add Client',          Icon: IconUserPlus,      desc: 'Walk you through inviting a client, then setting up their search and notes', prompt: 'Help me add a new client.' },
  { id: 'catch',  title: 'Catch Up',            Icon: IconCatchUp,       desc: 'Daily briefing that analyzes unread messages, notifications, and recent activity to suggest prioritized actions', prompt: 'Catch me up on my clients.' },
  { id: 'pulse',  title: 'Client Pulse',        Icon: IconChart,         desc: 'Analyze a client to get deeper insights, engagement patterns, member activity, and actionable suggestions', prompt: 'Show me a client pulse.' },
  { id: 'search', title: 'Search Optimization', Icon: IconSearchSpark,   desc: 'Analyze client behavior to detect preferences and recommend search refinements', prompt: 'Optimize a client’s search.' },
  { id: 'tour',   title: 'Coordinate Tour',     Icon: IconCalendarClock, desc: 'Coordinate showings with timeline, instructions, and outreach messages', prompt: 'Help me coordinate a tour.' },
]

// Try it answers in the onboarding intro (step 5): when to reach for each capability,
// with examples drawn from the sample client so it feels concrete.
const ASSIST_USE_CASES: Record<string, { text: string; examples: string[] }> = {
  add: {
    text: 'Use Add Client right after you meet a new buyer, so they’re connected before they start searching on their own. For example:',
    examples: [
      '“Invite Dana Whitfield by text and start a search for 3-bed homes in Maple Heights under $650K.”',
      '“Add notes from today’s call: pre-approved, needs a yard, wants to move by March.”',
    ],
  },
  catch: {
    text: 'Use Catch Up first thing in the morning to see who needs you most. For example, I’d tell you:',
    examples: [
      'Alex saved 3 homes overnight and asked about 1428 Maple Heights Dr. Reply first.',
      'Two homes your clients saved had price drops. Want me to draft a text?',
      'Dana hasn’t opened your invite in 3 days. A reminder might help.',
    ],
  },
  pulse: {
    text: 'Use Client Pulse before a call or showing to walk in knowing what your client wants. For example, for Alex:',
    examples: [
      'Most active in the evening; spends the longest on kitchens and backyards.',
      'Views are up 40% this week, which usually means they’re ready to tour.',
      'Keeps skipping homes without a garage.',
    ],
  },
  search: {
    text: 'Use Search Optimization when a client’s saved homes don’t match their search. For example:',
    examples: [
      'Alex saved 4 homes over $650K. Raise the max price to $675K?',
      '80% of their saved homes have a garage. Make it a must-have?',
      'They never open homes on busy streets. Filter those out?',
    ],
  },
  tour: {
    text: 'Use Coordinate Tour once a client wants to see homes in person. For example, for a 3-home Saturday tour with Alex:',
    examples: [
      'Put the homes in the shortest route from your office, with drive times.',
      'Request showings from the listing agents and track confirmations.',
      'Draft a text to Alex with the schedule and parking notes.',
    ],
  },
}

// ─── Assistant transcript ─────────────────────────────────────────────────────
// The panel starts empty (launcher shows first); a turn appears once the agent
// sends a message or picks a launcher action. Swap in your prototype's responder.
// Onboarding adds `actions` to AI turns: step-aware one-tap suggestions the Shell
// resolves via `runIntent` (fill in the profile from the agent's realtor.com profile).
type AssistIntent = 'fillProfile'
type Msg = { role: 'user' | 'ai'; text: string; examples?: string[]; actions?: { intent: AssistIntent; label: string }[] }
const SEED_MSGS: Msg[] = []

// ─── Threads (conversation history) ───────────────────────────────────────────
// The dock/overlay lists past RealAssist™ conversations. Static in the scaffold —
// rows, Edit, Delete, and Search are visual-only (no onClick / no filtering).
type Thread = { title: string; when: string }
const THREADS: Thread[] = [
  { title: 'Catch up on the Castellanos', when: '2 hours ago' },
  { title: 'Tour recap — 77 Birchwood Ln', when: 'Yesterday' },
  { title: 'Refine Priyanka’s search', when: '2 days ago' },
  { title: 'Weekly client digest', when: 'Last week' },
]

type NavId = 'clients' | 'search' | 'tours'
const NAV_ITEMS: { id: NavId; label: string; Icon: React.ElementType }[] = [
  { id: 'clients', label: 'Clients', Icon: IconClients },
  { id: 'search',  label: 'Search',  Icon: IconSearch },
  { id: 'tours',   label: 'Tours',   Icon: IconCalendar },
]

// Secondary rail cells, pinned above Account — inert in the scaffold.
const SECONDARY_NAV: { label: string; Icon: React.ElementType }[] = [
  { label: 'Support', Icon: IconSupport },
  { label: 'Alerts',  Icon: IconBell },
  { label: 'Chat',    Icon: IconChat },
]

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

function NavRail({ active, onNavigate }: { active: NavId; onNavigate: (id: NavId) => void }) {
  return (
    <nav
      aria-label="Main"
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

      {/* Secondary cells — inert in the scaffold */}
      {SECONDARY_NAV.map(({ label, Icon }) => (
        <RailCell key={label} icon={<Icon size={20} />} label={label} />
      ))}

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
function SubnavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
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

function Subnav({ variant, activeId, shown, onClose, clients, tours, onInvite }: {
  variant: 'clients' | 'tours'; activeId?: string; shown: boolean; onClose: () => void
  clients: Client[]; tours: Tour[]; onInvite: () => void
}) {
  const [tab, setTab] = useState<Client['status']>('Active')
  const title = variant === 'clients' ? 'Clients' : 'Tours'
  const rows = variant === 'clients' ? clients.filter(c => c.status === tab) : []
  const count = (t: Client['status']) => clients.filter(c => c.status === t).length

  // Animated collapse: the outer wrapper drives width 320↔0; the inner column
  // keeps its fixed 320 so its content doesn't reflow while it slides away.
  return (
    <div
      className={css({ flexShrink: '0', overflow: 'hidden' })}
      style={{ width: shown ? SUBNAV_WIDTH : '0px', transition: `width 220ms ${EASE}` }}
      aria-hidden={!shown}
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
          <CircleButton label="Invite clients" hoverTone="border" onClick={onInvite}><IconUserAddToProfile size={2} /></CircleButton>
          <CircleButton label="Hide panel" hoverTone="border" onClick={onClose}><IconPanelClose size={16} /></CircleButton>
        </div>

        {variant === 'clients' ? (
          <>
            {/* Agent's own feed */}
            <div className={css({ display: 'flex', gap: '300', alignItems: 'center', mx: '400' })}>
              <AvatarWithStatus name={AGENT.name} initials={AGENT.initials} online />
              <div className={css({ flex: '[1 1 auto]', minW: '0' })}>
                <p className={css({ fontWeight: 'semibold', color: 'text.base', m: '0' })} style={{ fontSize: 13.5 }}>{AGENT.name}</p>
                <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 11.5 }}>Your personal feed</p>
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
                <SubnavTab key={t} label={`${t} (${count(t)})`} active={tab === t} onClick={() => setTab(t)} />
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
                      <p className={css({ color: 'text.alternate', m: '0' })} style={{ fontSize: 11.5 }}>{c.sample ? 'Sample client · demo only' : c.status === 'Invited' ? c.lastSeen : `${c.listings} listings · ${c.lastSeen}`}</p>
                    </div>
                    <Menu label={`${c.name} options`} size={28} items={[
                      { label: 'View profile' }, { label: 'Mute notifications' },
                      { separator: true }, { label: 'Remove client', destructive: true },
                    ]} />
                  </div>
                )
              })}
              {rows.length === 0 && <EmptyNote>No {tab.toLowerCase()} clients.</EmptyNote>}
              {/* Empty state: only the sample client so far. */}
              {!clients.some(c => !c.sample) && (
                <div className={vstack({ alignItems: 'flex-start', gap: '300', paddingX: '300', paddingY: '400' })}>
                  <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>Invite clients to see their saved homes and activity here. They’ll appear once they create a free realtor.com account.</p>
                  <Button styleType="Secondary" size="sm" onClick={onInvite}>Invite clients</Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={vstack({ alignItems: 'stretch', gap: '100', marginX: '300' })}>
            {tours.map(t => (
              <div key={t.id} className={hstack({ gap: '300', padding: '300', borderRadius: '200', bg: 'bg.base', _hoverSupported: { bg: 'bg.disabled' } })}>
                <span className={circle({ size: '40px', flexShrink: '0', bg: 'bg.alternate', color: 'text.base' })}>
                  <IconCalendar size={18} />
                </span>
                <div className={vstack({ alignItems: 'flex-start', gap: '0', minW: '0' })}>
                  <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.base', truncate: true, maxW: '100%' })}>{t.homes.length > 1 ? `${t.homes[0].address1} +${t.homes.length - 1}` : t.homes[0]?.address1}</p>
                  <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>{t.client.name} · {t.when}</p>
                </div>
              </div>
            ))}
            {tours.length === 0 && <EmptyNote>No tours scheduled yet.</EmptyNote>}
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
  tone = 'light', collapsed, label, pressed, onClick, icon, children,
}: {
  tone?: 'brand' | 'dark' | 'light'; collapsed?: boolean; label: string
  pressed?: boolean; onClick?: () => void; icon?: React.ReactNode; children?: React.ReactNode
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
function ActionBar({ onAsk, panelOpen }: { onAsk: () => void; panelOpen: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null)
  // Number of collapsible pills (counted from the right — Favorites first) showing a label.
  const [labeled, setLabeled] = useState(FOLD_ITEMS.length)

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row || labeled === 0) return
    const kids = Array.from(row.children) as HTMLElement[]
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0
    const needed = kids.reduce((sum, k) => sum + k.offsetWidth, 0) + gap * Math.max(0, kids.length - 1)
    if (needed > row.clientWidth + 1) setLabeled(n => n - 1)
  }, [labeled])

  // Reset to fully-labeled on any width change or when the Ask pill toggles, then let the
  // layout effect above re-shed to the right level (this also handles *un*folding as space grows).
  useEffect(() => { setLabeled(FOLD_ITEMS.length) }, [panelOpen])
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const ro = new ResizeObserver(() => setLabeled(FOLD_ITEMS.length))
    ro.observe(row)
    return () => ro.disconnect()
  }, [])

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
      {!panelOpen && (
        <ActionPill tone="brand" label="Ask RealAssist AI" onClick={onAsk} icon={<IconRealAssist size={16} />}>Ask RealAssist™ AI</ActionPill>
      )}
    </div>
  )
}

function MainHeader({
  title, onAsk, panelOpen, showSubnavButton, subnavLabel, onOpenSubnav,
}: {
  title: string; onAsk: () => void; panelOpen: boolean
  showSubnavButton?: boolean; subnavLabel?: string; onOpenSubnav?: () => void
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
        <h1
          className={css({ m: '0', fontWeight: 'semibold', color: 'text.base', maxW: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
          style={{ fontFamily: DISPLAY_FONT, fontSize: 24, lineHeight: '28px', letterSpacing: '-0.02em' }}
        >{title}</h1>
      </div>
      <ActionBar onAsk={onAsk} panelOpen={panelOpen} />
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

function ClientsScreen() {
  const [pill, setPill] = useState(PILLS[0])
  const [view, setView] = useState<ClientsView>('grid')

  return (
    <div className={vstack({ alignItems: 'stretch', gap: '600', px: '600', pt: '300', pb: '600', overflowY: 'auto' })}>
      {/* Tiles: Saved & Tour requests + Saved Searches */}
      <div className={css({ display: 'flex', gap: '900', flexWrap: 'wrap' })}>
        <div className={vstack({ alignItems: 'stretch', gap: '[14px]' })}>
          <GroupHeading>Saved &amp; Tour requests</GroupHeading>
          <div className={hstack({ gap: '500' })}>
            <CountTile src={IMG.savedListings} count={CLIENT_FEED.savedCount} label="Saved listings" />
            <CountTile src={IMG.tourRequests} count={CLIENT_FEED.tourRequestCount} label="Tour requests" />
          </div>
        </div>
        <div className={vstack({ alignItems: 'stretch', gap: '[14px]' })}>
          <GroupHeading>Saved Searches</GroupHeading>
          <SavedSearchTile src={IMG.savedSearch} name={CLIENT_FEED.savedSearch.name} sub={CLIENT_FEED.savedSearch.sub} />
        </div>
      </div>

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

      {/* Today's listing feed */}
      <section className={vstack({ alignItems: 'stretch', gap: '500' })}>
        <GroupHeading>Today</GroupHeading>
        <div
          className={css({ display: 'grid', gap: '[20px]' })}
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(288px, 100%), 1fr))' }}
        >
          {LISTINGS.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
      </section>
      {/* ▼ Add more day-groups (Yesterday, This week) as your prototype needs them ▼ */}
    </div>
  )
}

// ─── Onboarding (first-run) ───────────────────────────────────────────────────
// Guided five-step modal (profile → invite → sample client → tour → RealAssist™),
// then a slim-row setup checklist on the workspace. Step state lives in `Shell` so
// the checklist can reopen the modal as a guided run of the remaining steps. Every
// step is completable without the assistant, and RealAssist™ never imports clients:
// clients join by invite and create a free realtor.com account to connect.

type StepStatus = 'todo' | 'done' | 'skipped'
type StepKey = 'profile' | 'invite' | 'sample' | 'tour' | 'assist'
const TASKS: StepKey[] = ['profile', 'invite', 'sample', 'tour', 'assist']
// Steps that show the RealAssist™ aside (two-column layout); the rest are single column.
const ASIDE_STEPS: StepKey[] = ['profile', 'assist']
const STEP_DEFS: Record<StepKey, { label: string; task: string; title: string; sub: string; skip: string | null }> = {
  profile: { label: 'Profile setup', task: 'Complete your profile', title: 'Confirm your profile', sub: 'Clients see this on invites, shared homes, and tour confirmations.', skip: null },
  invite: { label: 'Invite clients', task: 'Invite your first client', title: 'Invite your clients', sub: 'Send an invite or share your link. Clients create a free realtor.com account to connect with you.', skip: 'Skip for now' },
  sample: { label: 'Try a sample client', task: 'Message your sample client', title: 'Meet Alex, your sample client', sub: 'Alex is a demo client so you can try RDC+ before real clients sign up. Nothing here is sent to anyone.', skip: 'Skip for now' },
  tour: { label: 'Set up a tour', task: 'Schedule a tour', title: 'Set up a tour with Alex', sub: 'Pick homes and a time. It’ll show up under Tours.', skip: 'Skip for now' },
  assist: { label: 'Meet RealAssist™ AI', task: 'Meet RealAssist™ AI', title: 'Meet RealAssist™ AI', sub: 'After setup, your assistant is docked on the right of the workspace. Open it any time with Ask RealAssist™ AI. Here’s what it can do.', skip: 'Skip intro' },
}
const INITIAL_STATUS: Record<StepKey, StepStatus> = { profile: 'todo', invite: 'todo', sample: 'todo', tour: 'todo', assist: 'todo' }

type Profile = { name: string; brokerage: string; area: string; phone: string; email: string; license: string; photo: boolean }
const INITIAL_PROFILE: Profile = {
  name: AGENT.name, brokerage: AGENT.brokerage, area: '', phone: '',
  email: 'georgia.booth@brightwaterrealty.com', license: '', photo: false,
}
// What RealAssist™ "found" on the agent's public realtor.com profile.
const PROFILE_SUGGESTION = { area: 'Maple Heights, Cedar Park, Lakeview', phone: '(512) 555-0142' }
const HEADSHOT = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop'

// ── Invites ── An invited client shows as "Waiting to sign up" until they create an account.
type Invite = { id: string; name: string; contact: string }
const agentSlug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent'

// ── Sample client chat ── Scripted: each chip sends an agent message, Alex replies ~700ms later.
type ChatMsg = { from: 'agent' | 'client'; text: string; homeId?: string }
const CHAT_CHIPS: { id: string; label: string; msg: ChatMsg; reply: string }[] = [
  { id: 'share', label: 'Share a home', msg: { from: 'agent', text: 'Here’s one I think you’ll like.', homeId: 'l1' }, reply: 'Love the kitchen! Can we see it in person?' },
  { id: 'budget', label: 'Ask about budget', msg: { from: 'agent', text: 'What budget are you most comfortable with?' }, reply: 'Around $550K–$650K, ideally in Maple Heights.' },
  { id: 'tour', label: 'Offer a tour', msg: { from: 'agent', text: 'Want to tour this weekend?' }, reply: 'Saturday morning works great!' },
]
const SAMPLE_OPENER: ChatMsg = { from: 'client', text: 'Hi Georgia! I’ve been saving homes around Maple Heights. Can you help me narrow it down?' }

// ── Tours ── Homes Alex can tour: the two feed listings plus three more in the area.
type TourHome = { id: string; address1: string; address2: string; price: number; photo: string }
const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop`
const TOUR_HOMES: TourHome[] = [
  ...LISTINGS.map(l => ({ id: l.id, address1: l.address1, address2: l.address2, price: l.price, photo: l.photo })),
  { id: 'l3', address1: '902 Orchard Ct', address2: 'Maple Heights, ST 00000', price: 540000, photo: unsplash('photo-1568605114967-8130f3a36994') },
  { id: 'l4', address1: '31 Willow Bend Rd', address2: 'Maple Heights, ST 00000', price: 780000, photo: unsplash('photo-1564013799919-ab600027ffc6') },
  { id: 'l5', address1: '256 Cedar Ridge Way', address2: 'Maple Heights, ST 00000', price: 895000, photo: unsplash('photo-1570129477492-45c003edd2be') },
]
const fmtPrice = (n: number) => `$${n.toLocaleString('en-US')}`
// 30-minute showing slots, 9:00 AM–6:00 PM.
const TIME_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const m = 9 * 60 + i * 30, h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0')
  return { value: `${String(h).padStart(2, '0')}:${mm}`, text: `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}` }
})
function fmtTourWhen(date?: Date, time?: string) {
  if (!date || !time) return ''
  const t = TIME_OPTIONS.find(o => o.value === time)
  return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${t ? t.text : time}`
}
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

type Tour = { id: string; client: Client; homes: TourHome[]; when: string }
type TourDraft = { homeIds: string[]; date?: Date; time: string }

// Haven v4 types TextInput onChange with React 19's two-arg ChangeEventHandler; under
// this shell's @types/react 18 that fails to infer, so handlers annotate the event.
type InputEvt = React.ChangeEvent<HTMLInputElement>

// Section heading inside a step body (the dialog title is h2, the step heading h3).
function StepSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={vstack({ alignItems: 'stretch', gap: '400' })}>
      <h4 className={css({ textStyle: 'headingSm', color: 'text.base' })}>{title}</h4>
      {children}
    </section>
  )
}

// The flow frame: a top-aligned Haven Modal over the workspace. Body = progress +
// Finish later, the step heading, and the step (plus the RealAssist™ aside on steps
// that have one); it scrolls while the header and footer stay pinned.
function OnboardingFlow({
  open, seq, idx, title, ctaLabel, onBack, onSkip, onContinue, onFinishLater, onDismiss, onAfterClose, assist, children,
}: {
  open: boolean; seq: StepKey[]; idx: number; title: string; ctaLabel: string
  onBack: () => void; onSkip: () => void; onContinue: () => void; onFinishLater: () => void
  // ✕ / Escape / overlay. Kept separate so an Escape meant for an open popover can be ignored.
  onDismiss: () => void
  onAfterClose: (e: Event) => void; assist: React.ReactNode | null; children: React.ReactNode
}) {
  const def = STEP_DEFS[seq[idx]]
  const multi = seq.length > 1
  // Radix focuses the dialog on open (it announces the title); on each later step
  // change, move focus to the new step's heading so keyboard / SR users land at the top.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepId = `${seq.join(',')}:${idx}`
  const prevStep = useRef(stepId)
  useEffect(() => {
    if (prevStep.current === stepId) return
    prevStep.current = stepId
    headingRef.current?.focus()
  }, [stepId])
  const heading = (
    <div className={vstack({ alignItems: 'flex-start', gap: '200' })}>
      <h3 ref={headingRef} tabIndex={-1} className={css({ fontSize: '[22px]', lineHeight: '[28px]', fontWeight: 'semibold', color: 'text.base', outline: 'none' })}>{def.title}</h3>
      <p className={css({ textStyle: 'bodyMd', color: 'text.alternate' })}>{def.sub}</p>
    </div>
  )
  return (
    <Modal open={open} onClose={onDismiss} size="lg" verticalAlign="top" showStickyBorder onAfterClose={onAfterClose}>
      <Modal.Header title={title} />
      <Modal.Body>
        <div className={vstack({ alignItems: 'stretch', gap: '600', paddingY: '500' })}>
          {multi && (
            <div className={hstack({ gap: '400', justifyContent: 'space-between' })}>
              <ProgressIndicator stepIndex={idx} steps={seq.map(k => STEP_DEFS[k].label)} className={css({ flex: '1' })} />
              <Button styleType="Tertiary" size="sm" onClick={onFinishLater}>Finish later</Button>
            </div>
          )}
          {assist ? (
            <div className={grid({ gridTemplateColumns: '[minmax(0, 1fr) 272px]', gap: '600', alignItems: 'start' })}>
              <div className={vstack({ alignItems: 'stretch', gap: '600', minW: '0' })}>
                {heading}
                {children}
              </div>
              {assist}
            </div>
          ) : (
            <div className={vstack({ alignItems: 'stretch', gap: '600', minW: '0' })}>
              {heading}
              {children}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        {idx > 0 && <Button styleType="Tertiary" size="sm" startIcon={<IconArrowLeft size={2} />} onClick={onBack}>Back</Button>}
        <div className={css({ flex: '1' })} />
        {def.skip && <Button styleType="Ghost" size="sm" onClick={onSkip}>{def.skip}</Button>}
        <Button styleType="Primary" size="sm" onClick={onContinue}>{ctaLabel}</Button>
      </Modal.Footer>
    </Modal>
  )
}

// The RealAssist™ aside inside the modal (profile and Meet RealAssist™ steps only). The
// docked panel stays closed during onboarding, so the step's suggestion lives here: one
// message, a one-tap action, and the reply after it's used. Optional, as the caption says.
function OnboardingAssist({ msgs, onAction }: { msgs: Msg[]; onAction: (intent: AssistIntent, index: number) => void }) {
  return (
    <aside
      aria-label="RealAssist AI suggestion"
      className={vstack({ alignItems: 'stretch', gap: '400', padding: '500', borderRadius: '300', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', position: 'sticky', top: '0' })}
    >
      <div className={hstack({ gap: '300' })}>
        <span aria-hidden className={circle({ size: '32px', flexShrink: '0', color: 'text.base', bg: 'bg.alternate' })}>
          <IconRealAssist size={16} />
        </span>
        <div className={vstack({ alignItems: 'flex-start', gap: '0' })}>
          <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.base' })}>RealAssist™ AI</p>
          <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>Optional. Every step works without it.</p>
        </div>
      </div>
      <div aria-live="polite" className={vstack({ alignItems: 'stretch', gap: '300' })}>
        {msgs.map((m, i) => (
          <div key={i} className={vstack({ alignItems: 'flex-start', gap: '300' })}>
            <div className={vstack({ alignItems: 'stretch', gap: '200', bg: 'bg.alternate', padding: '400', borderRadius: '200' })}>
              <p className={css({ textStyle: 'bodySm', color: 'text.base' })}>{m.text}</p>
              {m.examples && (
                <ul className={vstack({ alignItems: 'stretch', gap: '200', m: '0', paddingLeft: '500', listStyle: 'disc' })}>
                  {m.examples.map(ex => <li key={ex} className={css({ textStyle: 'bodySm', color: 'text.base' })}>{ex}</li>)}
                </ul>
              )}
            </div>
            {m.actions?.map(a => (
              <Button key={a.intent} styleType="Secondary" size="sm" onClick={() => onAction(a.intent, i)}>{a.label}</Button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}

// ── Step 1 · Profile setup ──
function ProfileStep({ profile, onChange, attempted }: {
  profile: Profile; onChange: (p: Partial<Profile>) => void; attempted: boolean
}) {
  const missing = (v: string) => attempted && !v.trim()
  return (
    <>
      <StepSection title="Photo">
        <div className={hstack({ gap: '500' })}>
          {profile.photo
            ? <img src={HEADSHOT} alt={`${profile.name} headshot`} className={css({ w: '72px', h: '72px', borderRadius: 'circle', objectFit: 'cover', flexShrink: '0' })} />
            : <Initials initials={initialsOf(profile.name || AGENT.name)} size={72} fontSize={24} />}
          <div className={vstack({ alignItems: 'flex-start', gap: '200' })}>
            <Button styleType="Secondary" size="sm" onClick={() => onChange({ photo: !profile.photo })}>
              {profile.photo ? 'Remove photo' : 'Upload photo'}
            </Button>
            <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>A clear headshot helps clients recognize you. Optional.</p>
          </div>
        </div>
      </StepSection>
      <StepSection title="About you">
        <div className={grid({ columns: 2, gap: '500' })}>
          <TextInput label="Full name" required autoComplete="name" value={profile.name}
            onChange={(e: InputEvt) => onChange({ name: e.target.value })} error={missing(profile.name)} errorText="Enter your name" />
          <TextInput label="Brokerage" required value={profile.brokerage}
            onChange={(e: InputEvt) => onChange({ brokerage: e.target.value })} error={missing(profile.brokerage)} errorText="Enter your brokerage" />
          <TextInput label="Service area" required value={profile.area} className={css({ gridColumn: 'span 2' })}
            helperText="Cities, neighborhoods, or ZIP codes you work in"
            onChange={(e: InputEvt) => onChange({ area: e.target.value })} error={missing(profile.area)} errorText="Add at least one area you serve" />
          <TextInput label="Mobile phone" type="tel" autoComplete="tel" value={profile.phone}
            onChange={(e: InputEvt) => onChange({ phone: e.target.value })} />
          <TextInput label="Email" type="email" autoComplete="email" value={profile.email}
            onChange={(e: InputEvt) => onChange({ email: e.target.value })} />
          <TextInput label="License number" value={profile.license} helperText="Optional. Shown on your client-facing profile."
            onChange={(e: InputEvt) => onChange({ license: e.target.value })} />
        </div>
      </StepSection>
    </>
  )
}

// ── Step 2 · Invite clients ──
function InviteStep({ invites, onInvite, link, linkCopied, onCopy }: {
  invites: Invite[]; onInvite: (i: Invite) => void; link: string; linkCopied: boolean; onCopy: () => void
}) {
  const [draft, setDraft] = useState({ name: '', contact: '' })
  const [tried, setTried] = useState(false)
  function send() {
    if (!draft.name.trim() || !draft.contact.trim()) { setTried(true); return }
    onInvite({ id: `i${Date.now()}`, name: draft.name.trim(), contact: draft.contact.trim() })
    setDraft({ name: '', contact: '' })
    setTried(false)
  }
  return (
    <>
      <StepSection title="Send an invite">
        <div className={grid({ columns: 2, gap: '500' })}>
          <TextInput label="Client name" required autoComplete="off" value={draft.name}
            onChange={(e: InputEvt) => setDraft(d => ({ ...d, name: e.target.value }))}
            error={tried && !draft.name.trim()} errorText="Enter the client’s name" />
          <TextInput label="Email or mobile number" required autoComplete="off" value={draft.contact}
            onChange={(e: InputEvt) => setDraft(d => ({ ...d, contact: e.target.value }))}
            error={tried && !draft.contact.trim()} errorText="Enter an email or mobile number" />
        </div>
        <div><Button styleType="Secondary" size="sm" onClick={send}>Send invite</Button></div>
      </StepSection>

      <StepSection title="Or share your link">
        <div className={hstack({ gap: '300', alignItems: 'flex-end' })}>
          <TextInput label="Your invite link" readOnly value={link} className={css({ flex: '1' })}
            helperText="Anyone with this link can sign up and connect with you." />
          <Button styleType="Secondary" size="sm" startIcon={<IconCopy size={2} />} onClick={onCopy} className={css({ mb: '[26px]' })}>
            {linkCopied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      </StepSection>

      {invites.length > 0 && (
        <StepSection title={`Invited (${invites.length})`}>
          <div aria-live="polite" className={vstack({ alignItems: 'stretch', gap: '0' })}>
            {invites.map(i => (
              <div key={i.id} className={hstack({ gap: '400', paddingY: '300', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base' })}>
                <Initials initials={initialsOf(i.name)} size={32} fontSize={12} />
                <div className={vstack({ alignItems: 'flex-start', gap: '0', flex: '1', minW: '0' })}>
                  <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.base' })}>{i.name}</p>
                  <p className={css({ textStyle: 'caption', color: 'text.alternate', truncate: true, maxW: '100%' })}>{i.contact}</p>
                </div>
                <Tag dataColor="yellowSubtle">Waiting to sign up</Tag>
              </div>
            ))}
          </div>
        </StepSection>
      )}
    </>
  )
}

// ── Step 3 · Try a sample client ── A scripted chat with Alex; nothing is sent.
function HomeSnippet({ home }: { home: TourHome }) {
  return (
    <div className={hstack({ gap: '300', padding: '200', borderRadius: '200', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', mt: '200' })}>
      <img src={home.photo} alt="" className={css({ w: '56px', h: '42px', borderRadius: '100', objectFit: 'cover', flexShrink: '0' })} />
      <div className={vstack({ alignItems: 'flex-start', gap: '0', minW: '0' })}>
        <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.base' })}>{fmtPrice(home.price)}</p>
        <p className={css({ textStyle: 'caption', color: 'text.alternate', truncate: true, maxW: '100%' })}>{home.address1}</p>
      </div>
    </div>
  )
}

function SampleClientStep({ chat, onSend }: { chat: ChatMsg[]; onSend: (msg: ChatMsg, reply: string) => void }) {
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [chat.length])
  const used = new Set(chat.filter(m => m.from === 'agent').map(m => m.text))
  const chips = CHAT_CHIPS.filter(c => !used.has(c.msg.text))
  function sendText() {
    const t = text.trim()
    if (!t) return
    onSend({ from: 'agent', text: t }, 'Thanks, that sounds good.')
    setText('')
  }
  return (
    <Card bordered spacing="0">
      <Card.Content className={vstack({ alignItems: 'stretch', gap: '0' })}>
        <div className={hstack({ gap: '300', padding: '400', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base' })}>
          <Initials initials={SAMPLE_CLIENT.initials} size={40} />
          <div className={vstack({ alignItems: 'flex-start', gap: '0', flex: '1', minW: '0' })}>
            <p className={css({ textStyle: 'bodyMd', fontWeight: 'semibold', color: 'text.base' })}>{SAMPLE_CLIENT.name}</p>
            <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>Looking for $550K–$650K in Maple Heights</p>
          </div>
          <Tag dataColor="yellowSubtle">Sample client</Tag>
        </div>
        <div ref={scrollRef} aria-live="polite" aria-label="Conversation with Alex Rivera"
          className={vstack({ alignItems: 'stretch', gap: '300', padding: '400', h: '[260px]', overflowY: 'auto', bg: 'bg.alternate' })}>
          {chat.map((m, i) => {
            const home = m.homeId ? TOUR_HOMES.find(h => h.id === m.homeId) : undefined
            const agent = m.from === 'agent'
            return (
              <div key={i} className={css({ display: 'flex', justifyContent: agent ? 'flex-end' : 'flex-start' })}>
                <div className={css({
                  maxW: '[75%]', paddingX: '400', paddingY: '300', textStyle: 'bodySm', color: 'text.base',
                  bg: agent ? 'blue.100' : 'bg.base', borderRadius: '300',
                  borderWidth: agent ? '0' : '100', borderStyle: 'solid', borderColor: 'border.base',
                })}>
                  {m.text}
                  {home && <HomeSnippet home={home} />}
                </div>
              </div>
            )
          })}
        </div>
        <div className={vstack({ alignItems: 'stretch', gap: '300', padding: '400', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })}>
          {chips.length > 0 && (
            <div className={wrap({ gap: '200', alignItems: 'center' })}>
              <span className={css({ textStyle: 'caption', color: 'text.alternate' })}>Try:</span>
              {chips.map(c => <Chip key={c.id} size="sm" onClick={() => onSend(c.msg, c.reply)}>{c.label}</Chip>)}
            </div>
          )}
          <div className={hstack({ gap: '300', alignItems: 'flex-end' })}>
            <TextInput aria-label="Message Alex" placeholder="Write a message" value={text} className={css({ flex: '1' })}
              onChange={(e: InputEvt) => setText(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') sendText() }} />
            <Button styleType="Secondary" size="sm" onClick={sendText}>Send</Button>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}

// ── Step 4 · Set up a tour ──
// Searchable multi-select: a text filter (address or price), removable chips, and a
// checkbox list. The selected count is announced as it changes.
function HomeMultiSelect({ selected, onChange, error }: { selected: string[]; onChange: (ids: string[]) => void; error: boolean }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase().replace(/[$,]/g, '')
  const matches = TOUR_HOMES.filter(h => !needle
    || `${h.address1} ${h.address2}`.toLowerCase().includes(needle)
    || String(h.price).includes(needle) || fmtPrice(h.price).toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (id: string, on: boolean) => onChange(on ? [...selected, id] : selected.filter(s => s !== id))
  return (
    <Fieldset label="Homes to tour" required error={error} errorText="Choose at least one home">
      <div className={vstack({ alignItems: 'stretch', gap: '300' })}>
        <TextInput aria-label="Search homes" placeholder="Search by address or price" value={q}
          startAddon={<IconSearch size={16} />} onChange={(e: InputEvt) => setQ(e.target.value)} />
        {selected.length > 0 && (
          <div className={wrap({ gap: '200' })}>
            {selected.map(id => {
              const h = TOUR_HOMES.find(x => x.id === id)!
              return <Chip key={id} size="sm" selected showDismiss onDismissClick={() => toggle(id, false)}>{h.address1}</Chip>
            })}
          </div>
        )}
        <div className={vstack({ alignItems: 'stretch', gap: '0', maxH: '[144px]', overflowY: 'auto', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '200' })}>
          {matches.map(h => (
            <div key={h.id} className={css({ paddingX: '400', paddingY: '200', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base', _last: { borderBottomWidth: '0' } })}>
              <Checkbox checked={selected.includes(h.id)} onChange={(_e, on) => toggle(h.id, on)}>
                {h.address1} <span className={css({ color: 'text.alternate' })}>· {fmtPrice(h.price)}</span>
              </Checkbox>
            </div>
          ))}
          {matches.length === 0 && <p className={css({ textStyle: 'bodySm', color: 'text.alternate', padding: '400' })}>No homes match “{q}”.</p>}
        </div>
        <p aria-live="polite" className={css({ textStyle: 'caption', color: 'text.alternate' })}>{selected.length} selected</p>
      </div>
    </Fieldset>
  )
}

function TourSetupStep({ draft, onChange, attempted, onCalendarToggle }: {
  draft: TourDraft; onChange: (d: Partial<TourDraft>) => void; attempted: boolean
  onCalendarToggle: (open: boolean) => void
}) {
  const homes = draft.homeIds.map(id => TOUR_HOMES.find(h => h.id === id)!)
  return (
    <>
      <Fieldset label="Client" helperText="Tours use your sample client until a real client connects.">
        <div className={hstack({ gap: '300' })}>
          <Initials initials={SAMPLE_CLIENT.initials} size={32} fontSize={12} />
          <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.base' })}>{SAMPLE_CLIENT.name}</p>
          <Tag dataColor="yellowSubtle">Sample client</Tag>
        </div>
      </Fieldset>
      <HomeMultiSelect selected={draft.homeIds} onChange={homeIds => onChange({ homeIds })} error={attempted && homes.length === 0} />
      <div className={grid({ columns: 2, gap: '500' })}>
        <DatePicker label="Date" required value={draft.date} minDate={startOfToday()}
          onChange={date => onChange({ date })} error={attempted && !draft.date} errorText="Choose a date"
          onCalendarOpen={() => onCalendarToggle(true)} onCalendarClose={() => onCalendarToggle(false)} />
        <SelectInput
          label="Time" required value={draft.time}
          options={[{ text: 'Choose a time', value: '', hidden: true }, ...TIME_OPTIONS]}
          onChange={e => onChange({ time: e.target.value })}
          error={attempted && !draft.time} errorText="Choose a time"
        />
      </div>
      <StepSection title="Preview">
        <TourCard tour={{ id: 'preview', client: SAMPLE_CLIENT, homes, when: fmtTourWhen(draft.date, draft.time) }} preview showRoute />
      </StepSection>
    </>
  )
}

// Schematic route from the agent's office to each chosen home. Not real map data:
// swap in the product map component and real drive times.
const ROUTES: Record<string, { d: string; end: [number, number] }> = {
  l1: { d: 'M28 96 L28 64 L92 64 L92 34 L178 34 L178 20', end: [178, 20] },
  l2: { d: 'M28 96 L28 76 L120 76 L120 50 L212 50 L212 24', end: [212, 24] },
  l3: { d: 'M28 96 L92 96 L92 76 L178 76 L178 64', end: [178, 64] },
  l4: { d: 'M28 96 L28 34 L120 34', end: [120, 34] },
  l5: { d: 'M28 96 L212 96 L212 76', end: [212, 76] },
}
function RouteMap({ homeIds }: { homeIds: string[] }) {
  return (
    <svg viewBox="0 0 240 120" role="img" aria-label={homeIds.length ? `Route from your office to ${homeIds.length} home${homeIds.length > 1 ? 's' : ''}` : 'Route map'}
      className={css({ w: '100%', h: 'auto', display: 'block', bg: 'bg.alternate', borderRadius: '200' })}>
      <g className={css({ stroke: 'border.base' })} strokeWidth="6" strokeLinecap="round" fill="none">
        {[20, 34, 50, 64, 76, 96].map(y => <line key={`h${y}`} x1="12" y1={y} x2="228" y2={y} />)}
        {[28, 92, 120, 178, 212].map(x => <line key={`v${x}`} x1={x} y1="10" x2={x} y2="110" />)}
      </g>
      {homeIds.map((id, i) => ROUTES[id] && (
        <g key={id}>
          <path d={ROUTES[id].d} className={css({ stroke: 'text.base' })} strokeWidth="2.5" strokeLinejoin="round" fill="none" />
          <circle cx={ROUTES[id].end[0]} cy={ROUTES[id].end[1]} r="7" className={css({ fill: 'text.base' })} />
          <text x={ROUTES[id].end[0]} y={ROUTES[id].end[1] + 3} textAnchor="middle" fontSize="8" fontWeight="700" className={css({ fill: 'text.inverse' })}>{i + 1}</text>
        </g>
      ))}
      <circle cx="28" cy="96" r="5" className={css({ fill: 'bg.base', stroke: 'text.base' })} strokeWidth="2.5" />
      <text x="36" y="112" fontSize="8" fontWeight="600" className={css({ fill: 'text.base' })}>Your office</text>
      {homeIds.length === 0 && (
        <text x="120" y="56" textAnchor="middle" fontSize="9" className={css({ fill: 'text.alternate' })}>Choose homes to map the route</text>
      )}
    </svg>
  )
}

// ── Tours (replaces the shell's stub) ──
function TourCard({ tour, preview, showRoute }: { tour: Tour; preview?: boolean; showRoute?: boolean }) {
  const first = tour.homes[0]
  const n = tour.homes.length
  return (
    <Card bordered spacing="500">
      <Card.Content className={vstack({ alignItems: 'stretch', gap: '500' })}>
        <div className={hstack({ gap: '500', alignItems: 'flex-start' })}>
          {first
            ? <img src={first.photo} alt="" className={css({ w: '112px', h: '84px', borderRadius: '200', objectFit: 'cover', flexShrink: '0' })} />
            : <span aria-hidden className={css({ w: '112px', h: '84px', borderRadius: '200', bg: 'bg.alternate', flexShrink: '0' })} />}
          <div className={vstack({ alignItems: 'flex-start', gap: '200', flex: '1', minW: '0' })}>
            <div className={wrap({ gap: '200' })}>
              <Tag dataColor={preview ? 'graySubtle' : 'greenSubtle'}>{preview ? 'Not scheduled yet' : 'Scheduled'}</Tag>
              {tour.client.sample && <Tag dataColor="yellowSubtle">Sample client</Tag>}
            </div>
            <div className={vstack({ alignItems: 'flex-start', gap: '0', minW: '0', maxW: '100%' })}>
              <p className={css({ textStyle: 'bodyLg', fontWeight: 'bold', color: 'text.base' })}>{n ? `${n} home${n > 1 ? 's' : ''}` : 'No homes yet'}</p>
              {n > 0 && <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>{tour.homes.map(h => h.address1).join(' · ')}</p>}
            </div>
            <p className={css({ textStyle: 'bodySm', color: 'text.base' })}>{tour.client.name} · {tour.when || 'Pick a date and time'}</p>
            {!preview && <div className={wrap({ gap: '200', paddingTop: '200' })}>
              <Button styleType="Secondary" size="sm" startIcon={<IconCalendar size={16} />}>Add to calendar</Button>
              <Button styleType="Secondary" size="sm">Draft a text</Button>
              <Button styleType="Tertiary" size="sm" startIcon={<IconPencil size={14} />}>Edit</Button>
            </div>}
          </div>
        </div>
        {showRoute && <RouteMap homeIds={tour.homes.map(h => h.id)} />}
      </Card.Content>
    </Card>
  )
}

function ToursScreen({ tours, onSetUp }: { tours: Tour[]; onSetUp: () => void }) {
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '500', paddingX: '600', paddingTop: '300', paddingBottom: '600', overflowY: 'auto' })}>
      <h2 className={css({ textStyle: 'headingSm', color: 'text.base' })}>Upcoming</h2>
      {tours.map(t => <TourCard key={t.id} tour={t} />)}
      {tours.length === 0 && (
        <div className={vstack({ alignItems: 'flex-start', gap: '300' })}>
          <p className={css({ textStyle: 'bodyMd', color: 'text.alternate' })}>No tours scheduled yet.</p>
          <Button styleType="Secondary" size="sm" onClick={onSetUp}>Set up a tour</Button>
        </div>
      )}
    </div>
  )
}

// ── Step 5 · Meet RealAssist™ AI ── A carousel of the five capabilities; Try it
// answers in the aside.
function AssistIntroStep({ index, onIndex, onTry }: { index: number; onIndex: (i: number) => void; onTry: () => void }) {
  const a = ASSIST_ACTIONS[index]
  const last = ASSIST_ACTIONS.length - 1
  return (
    <div role="group" aria-roledescription="carousel" aria-label="RealAssist AI capabilities" className={vstack({ alignItems: 'stretch', gap: '400' })}>
      <Card bordered spacing="500" aria-live="polite">
        <Card.Content className={vstack({ alignItems: 'flex-start', gap: '300' })}>
          <a.Icon size={24} className={css({ color: 'text.base' })} />
          <p className={css({ textStyle: 'bodyLg', fontWeight: 'semibold', color: 'text.base' })}>{a.title}</p>
          <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>{a.desc}</p>
          <p className={css({ textStyle: 'bodySm', color: 'text.base' })}>Try asking: “{a.prompt}”</p>
          <Button styleType="Secondary" size="sm" onClick={onTry}>Try it</Button>
        </Card.Content>
      </Card>
      <div className={hstack({ gap: '300' })}>
        <Button styleType="Tertiary" size="sm" disabled={index === 0} onClick={() => onIndex(index - 1)}>Previous</Button>
        <Button styleType="Tertiary" size="sm" disabled={index === last} onClick={() => onIndex(index + 1)}>Next</Button>
        <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>{index + 1} of {ASSIST_ACTIONS.length}</p>
      </div>
    </div>
  )
}

// ── Setup checklist (design A · slim row) ──
// One bordered row at the top of the main column: progress ring, "{done} of 5 done ·
// Next: …", a Start/Resume for the next open task, and expand / hide controls. It's
// also where focus lands when the onboarding modal closes.
function ProgressRing({ done, total, size = 28, inverse = false }: { done: number; total: number; size?: number; inverse?: boolean }) {
  const r = (size - 3) / 2
  const c = 2 * Math.PI * r
  const m = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={css({ flexShrink: '0' })}>
      <circle cx={m} cy={m} r={r} fill="none" strokeWidth="3" className={inverse ? css({ stroke: 'text.inverse', opacity: '0.25' }) : css({ stroke: 'border.base' })} />
      <circle cx={m} cy={m} r={r} fill="none" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} transform={`rotate(-90 ${m} ${m})`}
        className={css({ stroke: inverse ? 'green.600' : 'status.success', transition: '[stroke-dashoffset 300ms ease]' })} />
    </svg>
  )
}

function StatusCircle({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <span aria-hidden className={circle({ size: '20px', flexShrink: '0', bg: 'status.success', color: 'text.inverse' })}>
        <IconCheck size={1.5} />
      </span>
    )
  }
  return (
    <span aria-hidden className={css({
      w: '20px', h: '20px', flexShrink: '0', borderRadius: 'circle', borderWidth: '[2px]', borderStyle: 'solid',
      borderColor: status === 'skipped' ? 'status.warning' : 'border.base',
    })} />
  )
}

function SetupChecklist({ status, hidden, onOpen, onHide, onShow, onDismiss, focusRef }: {
  status: Record<StepKey, StepStatus>; hidden: boolean
  onOpen: (k: StepKey) => void; onHide: () => void; onShow: () => void; onDismiss: () => void
  focusRef: React.Ref<HTMLDivElement>
}) {
  const [expanded, setExpanded] = useState(false)
  const done = TASKS.filter(t => status[t] === 'done').length
  const allDone = done === TASKS.length
  const next = TASKS.find(t => status[t] !== 'done')
  const verb = (k: StepKey) => (status[k] === 'skipped' ? 'Resume' : 'Start')

  if (hidden) {
    return (
      <div ref={focusRef} tabIndex={-1} className={css({ display: 'flex', justifyContent: 'flex-end', paddingX: '600', paddingTop: '300', flexShrink: '0', outline: 'none' })}>
        <Button styleType="Ghost" size="inline" onClick={onShow}>Show setup checklist · {done} of {TASKS.length}</Button>
      </div>
    )
  }
  return (
    <div ref={focusRef} tabIndex={-1} role="region" aria-label="Setup checklist"
      className={css({ paddingX: '600', paddingTop: '300', paddingBottom: '300', flexShrink: '0', outline: 'none' })}>
      <div className={css({ bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '[8px]', overflow: 'hidden', flexShrink: '0' })}>
        {/* Dark header row (bg.inverse) with inverse buttons; the task list below stays light. */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '[12px]', minH: '[52px]', padding: '[8px 8px 8px 16px]', bg: 'bg.inverse', color: 'text.inverse' })}>
          <ProgressRing done={done} total={TASKS.length} inverse />
          <div className={css({ flex: '1', minW: '0' })}>
            <p className={css({ fontSize: '[14px]', lineHeight: '[20px]', fontWeight: 'semibold', color: 'text.inverse', truncate: true })}>
              {allDone ? 'You’re all set up' : 'Finish setting up'}
            </p>
            <p className={css({ fontSize: '[13px]', lineHeight: '[18px]', color: 'text.inverse', opacity: '0.8', truncate: true })}>
              {done} of {TASKS.length} done{next ? ` · Next: ${STEP_DEFS[next].task}` : ''}
            </p>
          </div>
          {allDone
            ? <Button styleType="Primary" size="sm" inverse onClick={onDismiss}>Dismiss</Button>
            : next && <Button styleType="Primary" size="sm" inverse aria-label={`${verb(next)}: ${STEP_DEFS[next].task}`} onClick={() => onOpen(next)}>{verb(next)}</Button>}
          <Button styleType="Ghost" size="sm" inverse aria-expanded={expanded} aria-controls="setup-checklist-tasks"
            aria-label={expanded ? 'Collapse checklist' : 'Expand checklist'}
            iconOnly={expanded ? <IconChevronUp size={2} /> : <IconChevronDown size={2} />}
            onClick={() => setExpanded(e => !e)} />
          {!allDone && <Button styleType="Ghost" size="sm" inverse aria-label="Hide checklist" iconOnly={<IconCloseHv size={2} />} onClick={onHide} />}
        </div>
        {expanded && (
          <ul id="setup-checklist-tasks" className={css({ listStyle: 'none', m: '0', p: '0' })}>
            {TASKS.map(k => {
              const s = status[k]
              const isNext = k === next
              return (
                <li key={k} className={css({ display: 'flex', alignItems: 'center', gap: '[12px]', minH: '[44px]', padding: '[8px 16px]', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })}>
                  <StatusCircle status={s} />
                  <span className={css({
                    flex: '1', minW: '0', fontSize: '[14px]', lineHeight: '[20px]',
                    color: s === 'done' ? 'text.alternate' : 'text.base',
                    textDecoration: s === 'done' ? 'line-through' : 'none',
                    fontWeight: isNext ? 'semibold' : 'normal',
                  })}>
                    {STEP_DEFS[k].task}
                    <span className={css({ srOnly: true })}>{s === 'done' ? ' (done)' : s === 'skipped' ? ' (skipped)' : ''}</span>
                  </span>
                  {s === 'skipped' && <Tag dataColor="yellowSubtle">Skipped</Tag>}
                  {s !== 'done' && (
                    <Button styleType={isNext ? 'Primary' : 'Tertiary'} size="sm" aria-label={`${verb(k)}: ${STEP_DEFS[k].task}`} onClick={() => onOpen(k)}>
                      {verb(k)}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Stubbed screens ──────────────────────────────────────────────────────────

function ScreenPlaceholder({ label }: { label: string }) {
  return (
    <div className={vstack({ alignItems: 'center', justifyContent: 'center', flex: '1', gap: '200', color: 'text.alternate' })}>
      <p className={css({ textStyle: 'bodyMd', fontWeight: 'medium' })}>{label}</p>
      <p className={css({ textStyle: 'bodySm', color: 'text.disabled' })}>Replace with your prototype content (the real surface is a Leaflet map)</p>
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
function Composer({ value, onChange, onSend, home }: { value: string; onChange: (v: string) => void; onSend: () => void; home: boolean }) {
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
        placeholder={home ? 'How can I help you today?' : 'Ask about clients, tours, or listings'}
        aria-label="Message RealAssist"
        className={css({ flex: '[1 1 auto]', minW: '0', alignSelf: 'center', bg: 'transparent', border: 'none', outline: 'none', color: 'text.base', fontFamily: 'inherit', py: '200' })}
        style={{ fontSize: 14 }}
      />
      <SendButton enabled={enabled} onClick={onSend} home={home} />
    </div>
  )
}

// Transcript bubbles: user is a blue right-aligned bubble with a "Just now" stamp;
// AI is a bordered white left-aligned bubble. Radii/shadows match the reference.
function Transcript({ msgs }: { msgs: Msg[] }) {
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
        <div key={i} className={vstack({ alignItems: 'flex-start', gap: '300' })}>
          <div
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
        <div className={css({ display: 'grid', gap: '400' })} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 288px), 1fr))' }}>
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

        {/* Body — launcher (composer on top) until the first turn, then transcript + composer */}
        {home ? (
          <AssistantLauncher onPick={onPick} input={input} onInput={onInput} onSend={onSend} expanded={expanded} />
        ) : (
          <>
            <Transcript msgs={msgs} />
            <div className={css({ px: '400', pb: '400', flexShrink: '0' })}>
              <Composer value={input} onChange={onInput} onSend={onSend} home={false} />
            </div>
          </>
        )}

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

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function Shell() {
  const [active, setActive] = useState<NavId>('clients')
  const [subnavOpen, setSubnavOpen] = useState(true)
  // The docked panel is closed by default and stays closed after onboarding. It only
  // opens from the header's Ask RealAssist™ AI button; a hand-off message waits in it.
  const [panelOpen, setPanelOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [over, setOver] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>(SEED_MSGS)

  // ── Workspace data ── A new agent starts with only the sample client in the roster.
  const [invites, setInvites] = useState<Invite[]>([])
  const [linkCopied, setLinkCopied] = useState(false)
  const [chat, setChat] = useState<ChatMsg[]>([SAMPLE_OPENER])
  const [tours, setTours] = useState<Tour[]>([])

  // ── Onboarding state ── `seq` is the run of steps the modal walks (all five on first
  // run; the remaining ones when reopened from the checklist), `idx` the current one.
  const [flowOpen, setFlowOpen] = useState(true)
  const [seq, setSeq] = useState<StepKey[]>(TASKS)
  const [idx, setIdx] = useState(0)
  const [taskMode, setTaskMode] = useState(false)
  const [tourInRun, setTourInRun] = useState(false)
  const [status, setStatus] = useState<Record<StepKey, StepStatus>>(INITIAL_STATUS)
  const [attempted, setAttempted] = useState(false)
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE)
  const [draft, setDraft] = useState<TourDraft>({ homeIds: [], date: undefined, time: '' })
  const [capIndex, setCapIndex] = useState(0)
  const [profileAssist, setProfileAssist] = useState<Msg[]>(() => [{
    role: 'ai',
    text: `Hi ${firstNameOf(INITIAL_PROFILE.name)}, I’m RealAssist™ AI. I found your realtor.com agent profile. Want me to fill in your service area (${PROFILE_SUGGESTION.area}) and mobile number?`,
    actions: [{ intent: 'fillProfile', label: 'Fill in my profile' }],
  }])
  const introGreeting: Msg = { role: 'ai', text: 'Browse what I can do on the left, then choose Try it to see how I’d respond.' }
  const [introAssist, setIntroAssist] = useState<Msg[]>([introGreeting])
  // All onboarding state is in-memory on purpose: a refresh restarts the first run from
  // scratch for demos. In production, persist `status` and `dismissed` as user prefs.
  const [checklistHidden, setChecklistHidden] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const checklistRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const replyTimer = useRef<number>()
  // The DatePicker's calendar shares the modal's portal, so Escape reaches the Modal too.
  // While it's open, a modal dismiss is ignored so Escape only closes the calendar.
  const calendarOpen = useRef(false)
  useEffect(() => () => window.clearTimeout(replyTimer.current), [])

  const firstName = firstNameOf(profile.name)
  const roster: Client[] = [
    SAMPLE_CLIENT,
    ...invites.map(i => ({
      id: i.id, name: i.name, initials: initialsOf(i.name), budget: 'Not set', listings: 0,
      lastSeen: 'Waiting to sign up', status: 'Invited' as const, stage: 'New client' as const,
    })),
  ]
  const key = seq[idx]
  const multi = seq.length > 1

  // ── Step status ── Skipping never downgrades a step that's already done.
  function markStep(k: StepKey, s: StepStatus) {
    setStatus(prev => ({ ...prev, [k]: prev[k] === 'done' && s === 'skipped' ? 'done' : s }))
  }
  // Invite and sample count as done only if the agent actually engaged with them.
  function engaged(k: StepKey) {
    if (k === 'invite') return invites.length > 0 || linkCopied
    if (k === 'sample') return chat.some(m => m.from === 'agent')
    return true
  }
  function valid(k: StepKey) {
    if (k === 'profile') return !!(profile.name.trim() && profile.brokerage.trim() && profile.area.trim())
    if (k === 'tour') return draft.homeIds.length > 0 && !!draft.date && !!draft.time
    return true
  }

  // ── Step navigation ──
  function goTo(i: number) { setIdx(i); setAttempted(false) }
  function next(justCreatedTour = false) {
    if (idx < seq.length - 1) goTo(idx + 1)
    else finish(justCreatedTour)
  }
  function onContinue() {
    if (!valid(key)) { setAttempted(true); return }
    let created = false
    if (key === 'tour') {
      const homes = draft.homeIds.map(id => TOUR_HOMES.find(h => h.id === id)!)
      setTours(t => [...t, { id: `t${Date.now()}`, client: SAMPLE_CLIENT, homes, when: fmtTourWhen(draft.date, draft.time) }])
      setDraft({ homeIds: [], date: undefined, time: '' })
      setTourInRun(true)
      created = true
    }
    markStep(key, engaged(key) ? 'done' : 'skipped')
    next(created)
  }
  function onSkip() { markStep(key, 'skipped'); next() }
  function onBack() { if (idx > 0) goTo(idx - 1) }

  // Flow end (Finish, Finish later, ✕, Escape). First run lands on Tours if a tour
  // exists, else Clients; a checklist re-run stays put unless it created a tour.
  function finish(justCreatedTour = false) {
    const created = justCreatedTour || tourInRun
    const hasTours = tours.length > 0 || created
    setFlowOpen(false)
    setChecklistHidden(false)
    if (created) setActive('tours')
    else if (!taskMode) setActive(hasTours ? 'tours' : 'clients')
    setMsgs([{
      role: 'ai',
      text: hasTours
        ? `You’re set up, ${firstName}. Your first tour is under Tours. Want me to draft a text to confirm it with Alex?`
        : `You’re set up, ${firstName}. When you’re ready, invite a client or try the sample client.`,
    }])
  }
  // On close, send focus to the checklist (its Start/Resume reopens the modal) rather
  // than the page body; fall back to <main> when the checklist isn't shown.
  function onModalClosed(e: Event) {
    e.preventDefault()
    ;(checklistRef.current ?? mainRef.current)?.focus()
  }

  // Reopen the modal as a guided run of the remaining steps, in order, from `k`.
  function openTask(k: StepKey) {
    const open = TASKS.filter(t => status[t] !== 'done' || t === k)
    setSeq(open)
    setIdx(open.indexOf(k))
    setTaskMode(true)
    setTourInRun(false)
    setAttempted(false)
    setFlowOpen(true)
  }

  function dismissChecklist() { setDismissed(true) }

  // ── Step actions ──
  function copyLink() {
    navigator.clipboard?.writeText(`https://${inviteLink}`).catch(() => {})
    setLinkCopied(true)
  }
  function sendChat(msg: ChatMsg, reply: string) {
    setChat(c => [...c, msg])
    window.clearTimeout(replyTimer.current)
    replyTimer.current = window.setTimeout(() => setChat(c => [...c, { from: 'client', text: reply }]), 700)
  }

  // A RealAssist™ action button in the modal aside was tapped: apply it, strip it, confirm.
  function runIntent(intent: AssistIntent, index: number) {
    if (intent !== 'fillProfile') return
    setProfile(p => ({ ...p, ...PROFILE_SUGGESTION }))
    setProfileAssist(m => [
      ...m.map((msg, i) => (i === index ? { ...msg, actions: undefined } : msg)),
      { role: 'ai', text: 'Done. I added your service area and mobile number. Review them and choose Continue.' },
    ])
  }
  function tryCapability() {
    // Each Try it replaces the previous answer (the greeting stays) so the aside never scrolls.
    const a = ASSIST_ACTIONS[capIndex]
    setIntroAssist([introGreeting, { role: 'ai', ...ASSIST_USE_CASES[a.id] }])
  }

  // Subnav only exists for Clients and Tours (Search is a full-bleed map).
  const subnavVariant = active === 'clients' ? 'clients' : active === 'tours' ? 'tours' : null
  const activeClient = roster[0]
  const inviteLink = `realtor.com/agents/${agentSlug(profile.name)}`

  function send() {
    const text = input.trim()
    if (!text) return
    // Canned stand-in — swap in your prototype's responder.
    setMsgs(m => [...m, { role: 'user', text }, { role: 'ai', text: 'Got it. In a live prototype I’d act on that and show the result here.' }])
    setInput('')
  }

  // Picking a launcher action seeds a turn and flips the panel to the transcript.
  // "Add Client" opens the invite step; "Coordinate Tour" opens the tour step until a
  // first tour exists.
  function pickAction(a: AssistAction) {
    if (a.id === 'add') { openTask('invite'); return }
    if (a.id === 'tour' && tours.length === 0) { openTask('tour'); return }
    setMsgs(m => [
      ...m,
      { role: 'user', text: a.prompt },
      { role: 'ai', text: `Starting “${a.title}”. In a live prototype I’d run this and show the result here.` },
    ])
  }

  const openPanel = () => setPanelOpen(true)
  const toggleOver = () => setOver(o => !o)
  // Expanding reveals the inline Threads dock; collapsing hides it again.
  const toggleExpand = () => { const next = !expanded; setExpanded(next); setOver(next) }
  const newChat = () => { setMsgs([]); setOver(false); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setExpanded(false); setOver(false) }

  // The panel is absolutely positioned (it leaves the flow); when it's open and
  // not expanded, the main column reserves its width so content isn't hidden under it.
  const mainMarginRight = panelOpen && !expanded ? PANEL_WIDTH : '0px'

  const title = active === 'clients' ? (activeClient?.name ?? 'Clients') : active === 'search' ? 'Search' : 'Tours'
  const flowTitle = taskMode ? (multi ? 'Finish setting up RDC+' : STEP_DEFS[key].label) : `Welcome to RDC+, ${firstName}`
  const ctaLabel = key === 'tour' ? 'Schedule tour' : taskMode && !multi ? 'Done' : idx === seq.length - 1 ? 'Finish' : 'Continue'

  return (
    <div className={css({ position: 'relative', display: 'flex', alignItems: 'stretch', bg: 'bg.base', overflow: 'hidden' })} style={{ minWidth: '1024px', height: '100vh' }}>
      <NavRail active={active} onNavigate={setActive} />

      {subnavVariant !== null && (
        <Subnav
          variant={subnavVariant} activeId={activeClient?.id} shown={subnavOpen} onClose={() => setSubnavOpen(false)}
          clients={roster} tours={tours} onInvite={() => openTask('invite')}
        />
      )}

      {/* Main column — the live workspace; it updates behind the onboarding modal. */}
      <div className={vstack({ alignItems: 'stretch', gap: '0', flex: '1', minW: '0' })} style={{ marginRight: mainMarginRight, transition: `margin-right 220ms ${EASE}` }}>
        <MainHeader
          title={title}
          onAsk={openPanel}
          panelOpen={panelOpen}
          showSubnavButton={subnavVariant !== null && !subnavOpen}
          subnavLabel={subnavVariant === 'clients' ? 'Clients' : 'Tours'}
          onOpenSubnav={() => setSubnavOpen(true)}
        />
        <main ref={mainRef} tabIndex={-1} className={css({ display: 'flex', flexDirection: 'column', flex: '1', minH: '0', outline: 'none' })}>
          {!flowOpen && !dismissed && (
            <SetupChecklist
              status={status} hidden={checklistHidden} onOpen={openTask}
              onHide={() => setChecklistHidden(true)} onShow={() => setChecklistHidden(false)}
              onDismiss={dismissChecklist} focusRef={checklistRef}
            />
          )}
          {active === 'clients' && <ClientsScreen />}
          {active === 'search' && <ScreenPlaceholder label="Search map" />}
          {active === 'tours' && <ToursScreen tours={tours} onSetUp={() => openTask('tour')} />}
        </main>
      </div>

      <AssistantPanel
        msgs={msgs}
        input={input}
        onInput={setInput}
        onSend={send}
        onPick={pickAction}
        open={panelOpen}
        expanded={expanded}
        over={over}
        onToggleOver={toggleOver}
        onToggleExpand={toggleExpand}
        onNewChat={newChat}
        onClose={closePanel}
      />

      <OnboardingFlow
        open={flowOpen} seq={seq} idx={idx} title={flowTitle} ctaLabel={ctaLabel}
        onBack={onBack} onSkip={onSkip} onContinue={onContinue}
        onFinishLater={() => finish()} onDismiss={() => { if (!calendarOpen.current) finish() }} onAfterClose={onModalClosed}
        assist={ASIDE_STEPS.includes(key)
          ? <OnboardingAssist msgs={key === 'profile' ? profileAssist : introAssist} onAction={runIntent} />
          : null}
      >
        {key === 'profile' && <ProfileStep profile={profile} onChange={p => setProfile(prev => ({ ...prev, ...p }))} attempted={attempted} />}
        {key === 'invite' && (
          <InviteStep invites={invites} onInvite={i => setInvites(v => [...v, i])} link={inviteLink} linkCopied={linkCopied} onCopy={copyLink} />
        )}
        {key === 'sample' && <SampleClientStep chat={chat} onSend={sendChat} />}
        {key === 'tour' && (
          <TourSetupStep draft={draft} onChange={d => setDraft(prev => ({ ...prev, ...d }))} attempted={attempted}
            onCalendarToggle={o => { calendarOpen.current = o }} />
        )}
        {key === 'assist' && <AssistIntroStep index={capIndex} onIndex={setCapIndex} onTry={tryCapability} />}
      </OnboardingFlow>
    </div>
  )
}

function firstNameOf(name: string) { return name.trim().split(' ')[0] || 'there' }
