import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  ContentSwitch,
  DatePicker,
  Fieldset,
  InlineMessage,
  Link,
  Modal,
  Nav,
  Popover,
  ProgressIndicator,
  PropertyCard,
  Radio,
  SaveButton,
  Search,
  SelectInput,
  StatusBadge,
  Tabs,
  Tag,
  TextInput,
} from '@rdc-npm/rdc-ui-v4'
import {
  IconArrowLeft, IconCalendar, IconCheck, IconChevronDown, IconChevronUp, IconClose, IconFilter, IconHeart,
  IconHome, IconMessage, IconNotifications, IconCashReward,
} from '@rdc-npm/rdc-ui-v4/illustrations'
import { css } from 'styled-system/css'
import { circle, grid, hstack, vstack, wrap } from 'styled-system/patterns'

// ─── What this is ─────────────────────────────────────────────────────────────
// Realtor.com+ for consumers: the client side of the agent workspace in ../agent.
// A buyer accepts an invite from their agent (Georgia Booth) and lands in a
// first-run modal that walks four steps: meet your agent + chat, search and save
// homes, request a tour, and set up My Home. The IA behind it is Search,
// My Listings, Tours, My Home, with Chat in the header. Built on the Daisy
// consumer-srp shell; the step modal and setup checklist mirror the agent app.
//
// All state is in memory on purpose: a refresh restarts the first run for demos.

// ─── Sample data ──────────────────────────────────────────────────────────────

const AGENT = {
  name: 'Georgia Booth',
  first: 'Georgia',
  brokerage: 'Brightwater Realty Group',
  phone: '(480) 555-0142',
  email: 'georgia.booth@brightwaterrealty.com',
  photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop',
}
const INITIAL_PROFILE = { name: 'Jordan Lee', email: 'jordan.lee@gmail.com', phone: '' }
type Profile = typeof INITIAL_PROFILE

const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop`
type Listing = {
  id: string; address1: string; address2: string; price: number; beds: number; baths: number; sqft: number
  status: 'For sale' | 'New' | 'Pending'; photo: string
}
const LISTINGS: Listing[] = [
  { id: 'l1', address1: '7101 E Admiralty Ln', address2: 'Scottsdale, AZ 85258', price: 615000, beds: 3, baths: 2, sqft: 1880, status: 'New', photo: unsplash('photo-1568605114967-8130f3a36994') },
  { id: 'l2', address1: '8402 E Via De Ventura', address2: 'Scottsdale, AZ 85258', price: 489000, beds: 2, baths: 2, sqft: 1410, status: 'For sale', photo: unsplash('photo-1570129477492-45c003edd2be') },
  { id: 'l3', address1: '10215 N 64th Pl', address2: 'Scottsdale, AZ 85253', price: 1150000, beds: 4, baths: 3.5, sqft: 3260, status: 'For sale', photo: unsplash('photo-1512917774080-9991f1c4c750') },
  { id: 'l4', address1: '5820 N Granite Reef Rd', address2: 'Scottsdale, AZ 85250', price: 729000, beds: 3, baths: 2.5, sqft: 2140, status: 'Pending', photo: unsplash('photo-1493809842364-78817add7ffb') },
  { id: 'l5', address1: '9330 E Lupine Ave', address2: 'Scottsdale, AZ 85260', price: 845000, beds: 4, baths: 3, sqft: 2690, status: 'For sale', photo: unsplash('photo-1600596542815-ffad4c1539a9') },
  { id: 'l6', address1: '7614 E Hubbell St', address2: 'Scottsdale, AZ 85257', price: 562000, beds: 3, baths: 2, sqft: 1720, status: 'New', photo: unsplash('photo-1600585154340-be6161a56a0c') },
  { id: 'l7', address1: '11880 E Desert Trl', address2: 'Scottsdale, AZ 85259', price: 1395000, beds: 5, baths: 4, sqft: 4120, status: 'For sale', photo: unsplash('photo-1580587771525-78b9dba3b914') },
  { id: 'l8', address1: '6950 E Cholla St', address2: 'Scottsdale, AZ 85254', price: 678000, beds: 3, baths: 2, sqft: 1960, status: 'For sale', photo: unsplash('photo-1564013799919-ab600027ffc6') },
]
const listingById = (id: string) => LISTINGS.find(l => l.id === id)!
const fmtPrice = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

const PRICE_OPTIONS = [
  { text: 'No max', value: '0' },
  { text: '$500K', value: '500000' },
  { text: '$750K', value: '750000' },
  { text: '$1M', value: '1000000' },
  { text: '$1.5M', value: '1500000' },
]
const BEDS_OPTIONS = [
  { text: 'Any', value: '0' },
  { text: '2+', value: '2' },
  { text: '3+', value: '3' },
  { text: '4+', value: '4' },
]
type SearchCriteria = { location: string; maxPrice: string; minBeds: string }
const INITIAL_CRITERIA: SearchCriteria = { location: 'Scottsdale, AZ', maxPrice: '750000', minBeds: '3' }
type SavedSearch = { id: string; name: string; criteria: SearchCriteria }
function matches(c: SearchCriteria) {
  const max = Number(c.maxPrice)
  return LISTINGS.filter(l => (!max || l.price <= max) && l.beds >= Number(c.minBeds))
}
function describe(c: SearchCriteria) {
  const price = PRICE_OPTIONS.find(o => o.value === c.maxPrice)!
  const beds = BEDS_OPTIONS.find(o => o.value === c.minBeds)!
  return [c.location || 'Anywhere', c.maxPrice !== '0' && `Under ${price.text}`, c.minBeds !== '0' && `${beds.text} beds`].filter(Boolean).join(' · ')
}

const TIME_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const mins = 8 * 60 + i * 30
  const h = Math.floor(mins / 60), m = mins % 60
  const label = `${((h + 11) % 12) + 1}:${m ? '30' : '00'} ${h < 12 ? 'AM' : 'PM'}`
  return { text: label, value: label }
})
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
function nextSaturday() { const d = startOfToday(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return d }
const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const fmtGroupDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: '2-digit', day: '2-digit', year: '2-digit' })

type Tour = { id: string; homeId: string; date: Date; time: string; note: string }
type TourDraft = { homeId: string; date?: Date; time: string; note: string }
const EMPTY_DRAFT: TourDraft = { homeId: '', date: undefined, time: '', note: '' }

type ChatMsg = { from: 'agent' | 'me'; text: string; homeId?: string }
const CHAT_SEED: ChatMsg[] = [
  { from: 'agent', text: 'Hi Jordan, welcome to Realtor.com+! This is where we’ll share homes, plan tours, and keep everything in one place. Say hi whenever you’re ready.' },
  { from: 'agent', text: 'Here’s one I think you’ll like. It just came on the market.', homeId: 'l1' },
]
const QUICK_REPLIES: { label: string; text: string; reply: string }[] = [
  { label: 'Say hi', text: 'Hi Georgia! Excited to get started.', reply: 'Me too! Save any homes you like and I’ll keep an eye on them for you.' },
  { label: 'Ask about 7101 Admiralty', text: 'Is 7101 E Admiralty Ln still available?', reply: 'It is. There’s an open house Saturday, or I can book you a private showing.' },
  { label: 'Best way to reach you', text: 'What’s the best way to reach you?', reply: 'Chat here is fastest. I also get a text when you message me.' },
]

type OwnedHome = { address: string }
const HOME_SUGGESTION = '4205 Kachina Dr, Austin, TX 78735'
const HOME_VALUE = 840400

// Haven v4 types TextInput onChange with React 19's two-arg ChangeEventHandler; under
// this shell's @types/react 18 that fails to infer, so handlers annotate the event.
type InputEvt = React.ChangeEvent<HTMLInputElement>

// ─── Onboarding steps ─────────────────────────────────────────────────────────

type StepStatus = 'todo' | 'done' | 'skipped'
type StepKey = 'agent' | 'search' | 'tour' | 'home'
const TASKS: StepKey[] = ['agent', 'search', 'tour', 'home']
const STEP_DEFS: Record<StepKey, { label: string; task: string; title: string; sub: string; skip: string | null }> = {
  agent: {
    label: 'Your agent', task: 'Meet your agent',
    title: 'Georgia Booth invited you to Realtor.com+',
    sub: 'Confirm your details so Georgia can reach you. Your chat with her is already open.',
    skip: null,
  },
  search: {
    label: 'Search', task: 'Save a search and homes',
    title: 'What are you looking for?',
    sub: 'Save a search to get new matches, and save homes you like. Georgia sees what you save.',
    skip: 'Skip for now',
  },
  tour: {
    label: 'Tour', task: 'Request a tour',
    title: 'Request your first tour',
    sub: 'Pick a home and a time that works for you. Georgia confirms the showing.',
    skip: 'Skip for now',
  },
  home: {
    label: 'My Home', task: 'Set up My Home',
    title: 'Do you own a home?',
    sub: 'Track its value and see what you could make if you sell. You can add it later.',
    skip: 'Skip for now',
  },
}
const ASIDE_STEPS: StepKey[] = ['agent', 'tour']
const INITIAL_STATUS: Record<StepKey, StepStatus> = { agent: 'todo', search: 'todo', tour: 'todo', home: 'todo' }

// ─── Small pieces ─────────────────────────────────────────────────────────────

function RealtorPlusLogo() {
  return (
    <Link href="#" aria-label="Realtor.com+ home" underline="none" className={css({ flexShrink: '0' })}>
      <span className={hstack({ gap: '100', flexWrap: 'nowrap' })}>
        <img src="https://static.rdc.moveaws.com/rdc-ui/logos/logo-brand.svg" alt="" className={css({ h: '[19px]', w: '[136px]', display: 'block', flexShrink: '0' })} />
        <span aria-hidden className={css({ textStyle: 'headingMd', color: 'brand', lineHeight: '[1]' })}>+</span>
      </span>
    </Link>
  )
}

function AgentAvatar({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  return <Avatar size={size} src={AGENT.photo} imgAlt={AGENT.name} />
}

function StepSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={vstack({ alignItems: 'stretch', gap: '400' })}>
      <h4 className={css({ textStyle: 'headingSm', color: 'text.base' })}>{title}</h4>
      {children}
    </section>
  )
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className={vstack({ alignItems: 'center', gap: '300', paddingY: '1200', paddingX: '600', textAlign: 'center', borderWidth: '100', borderStyle: 'dashed', borderColor: 'border.base', borderRadius: '300' })}>
      <p className={css({ textStyle: 'headingSm', color: 'text.base' })}>{title}</p>
      <p className={css({ textStyle: 'bodyMd', color: 'text.alternate', maxW: '[420px]' })}>{body}</p>
      {action}
    </div>
  )
}

function HomeSnippet({ home }: { home: Listing }) {
  return (
    <div className={hstack({ gap: '300', padding: '200', borderRadius: '200', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', mt: '200' })}>
      <img src={home.photo} alt="" className={css({ w: '[56px]', h: '[42px]', borderRadius: '100', objectFit: 'cover', flexShrink: '0' })} />
      <div className={vstack({ alignItems: 'flex-start', gap: '0', minW: '0' })}>
        <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.base' })}>{fmtPrice(home.price)}</p>
        <p className={css({ textStyle: 'caption', color: 'text.alternate', truncate: true, maxW: 'full' })}>{home.address1}</p>
      </div>
    </div>
  )
}

// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({ listing, saved, onSave, onChat, toured, onTour }: {
  listing: Listing; saved: boolean; onSave: () => void; onChat: () => void; toured: boolean; onTour: () => void
}) {
  return (
    <PropertyCard
      address1={listing.address1}
      address2={listing.address2}
      price={listing.price}
      propertyMeta={{ beds: listing.beds, baths_full: Math.floor(listing.baths), baths_half: listing.baths % 1 >= 0.5 ? 1 : 0, sqft: listing.sqft }}
      media={<img src={listing.photo} alt={listing.address1} />}
      description={<StatusBadge dataColor={listing.status === 'Pending' ? 'yellow' : 'green'}>{listing.status}</StatusBadge>}
      footer={
        <div className={wrap({ gap: '200', w: 'full' })}>
          <Button styleType="Secondary" size="sm" startIcon={<IconMessage size={2} />} onClick={onChat}>Chat</Button>
          {toured
            ? <Button styleType="Tertiary" size="sm" startIcon={<IconCheck size={2} />} disabled>Tour requested</Button>
            : <Button styleType="Secondary" size="sm" startIcon={<IconCalendar size={2} />} onClick={onTour}>Request tour</Button>}
        </div>
      }
      cardOverlayProps={{ bottomRightComponent: <SaveButton saved={saved} label={listing.address1} size="sm" onClick={onSave} /> }}
    />
  )
}

const cardGrid = css({
  display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '500',
  xs: { gridTemplateColumns: 'repeat(2, 1fr)' }, md: { gridTemplateColumns: 'repeat(3, 1fr)' }, lg: { gridTemplateColumns: 'repeat(4, 1fr)' },
})

type CardActions = {
  saved: Set<string>; toggleSave: (id: string) => void; shareToChat: (id: string) => void
  touredIds: Set<string>; requestTour: (id: string) => void
}
function cardProps(l: Listing, a: CardActions) {
  return {
    listing: l, saved: a.saved.has(l.id), onSave: () => a.toggleSave(l.id), onChat: () => a.shareToChat(l.id),
    toured: a.touredIds.has(l.id), onTour: () => a.requestTour(l.id),
  }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

function ChatTranscript({ chat }: { chat: ChatMsg[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [chat.length])
  return (
    <div ref={scrollRef} aria-live="polite" aria-label={`Conversation with ${AGENT.name}`}
      className={vstack({ alignItems: 'stretch', gap: '300', padding: '400', overflowY: 'auto', bg: 'bg.alternate', h: '[360px]' })}>
      <div className={vstack({ gap: '200', paddingY: '200' })}>
        <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>{fmtDay(new Date())}</p>
        <AgentAvatar size="md" />
        <p className={css({ textStyle: 'caption', color: 'text.alternate', textAlign: 'center' })}>This is the beginning of your chat with {AGENT.name}</p>
      </div>
      {chat.map((m, i) => {
        const home = m.homeId ? listingById(m.homeId) : undefined
        const mine = m.from === 'me'
        return (
          <div key={i} className={hstack({ gap: '200', alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start' })}>
            {!mine && <AgentAvatar size="xs" />}
            <div className={css({
              maxW: '[78%]', paddingX: '400', paddingY: '300', textStyle: 'bodySm', color: 'text.base', borderRadius: '300',
              bg: mine ? 'blue.100' : 'bg.base', borderWidth: mine ? '0' : '100', borderStyle: 'solid', borderColor: 'border.base',
            })}>
              {m.text}
              {home && <HomeSnippet home={home} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChatComposer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  function send() {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  return (
    <div className={hstack({ gap: '300', padding: '400', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })}>
      <TextInput aria-label={`Message ${AGENT.first}`} placeholder="Message..." value={text} className={css({ flex: '1' })}
        onChange={(e: InputEvt) => setText(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') send() }} />
      <Button styleType="Primary" size="sm" onClick={send}>Send</Button>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

type NavId = 'search' | 'listings' | 'tours' | 'home'
const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: 'search', label: 'Search' },
  { id: 'listings', label: 'My Listings' },
  { id: 'tours', label: 'Tours' },
  { id: 'home', label: 'My Home' },
]

function Header({ active, onNavigate, chat, chatOpen, onChatOpen, onChatClose, onSend, unread, initials }: {
  active: NavId; onNavigate: (id: NavId) => void
  chat: ChatMsg[]; chatOpen: boolean; onChatOpen: () => void; onChatClose: () => void; onSend: (t: string) => void
  unread: number; initials: string
}) {
  return (
    <header className={css({
      position: 'sticky', top: '0', zIndex: 'sticky', bg: 'bg.base', borderBottomWidth: '100', borderBottomStyle: 'solid',
      borderColor: 'border.base', h: '[56px]', display: 'flex', alignItems: 'center', gap: '400', px: { base: '500', sm: '700' },
    })}>
      <RealtorPlusLogo />
      <Nav aria-label="Main navigation" hideBorder className={css({ alignSelf: 'stretch', overflowX: 'auto', '& > *': { alignSelf: 'stretch' } })}>
        {NAV_ITEMS.map(item => (
          <Nav.Link key={item.id} active={active === item.id} onClick={() => onNavigate(item.id)}>{item.label}</Nav.Link>
        ))}
      </Nav>
      <div className={css({ flex: '1' })} />
      <div className={hstack({ gap: '200', flexShrink: '0' })}>
        <Popover
          open={chatOpen} onClose={onChatClose} placement="bottom-end" offset={8} maxWidth="400px"
          header={<p className={css({ textStyle: 'headingSm', color: 'text.base' })}>Chat</p>}
          body={
            <div className={vstack({ alignItems: 'stretch', gap: '0', w: '[368px]', maxW: 'full' })}>
              <ChatTranscript chat={chat} />
              <ChatComposer onSend={onSend} />
            </div>
          }
        >
          <Badge badgeCount={unread} dataColor="alert" showZero={false}>
            <Button styleType="Ghost" size="sm" iconOnly={<IconMessage size={3} />} aria-label={unread ? `Chat, ${unread} unread` : 'Chat'}
              aria-expanded={chatOpen} onClick={() => (chatOpen ? onChatClose() : onChatOpen())} />
          </Badge>
        </Popover>
        <Button styleType="Ghost" size="sm" iconOnly={<IconNotifications size={3} />} aria-label="Notifications" />
        <Button styleType="Ghost" size="sm" iconOnly={<Avatar size="xs" initials={initials} />} aria-label="Account" />
      </div>
    </header>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────

const FILTER_CHIPS = ['New construction', 'Min $100K', 'Hide pending / contingent', 'Hide foreclosures', 'Hide land', 'Hide mobile homes']

function SearchScreen({ criteria, onCriteria, savedSearch, onSaveSearch, actions }: {
  criteria: SearchCriteria; onCriteria: (c: Partial<SearchCriteria>) => void
  savedSearch: boolean; onSaveSearch: () => void; actions: CardActions
}) {
  const [mapView, setMapView] = useState(false)
  const [chips, setChips] = useState<Set<string>>(new Set())
  const toggleChip = (c: string) => setChips(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })
  const results = matches(criteria)
  return (
    <>
      <div className={css({ bg: 'bg.base', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base', px: { base: '500', sm: '700' }, py: '300' })}>
        <div className={hstack({ gap: '300', flexWrap: 'wrap' })}>
          <div className={css({ flex: '1', minW: { base: 'full', sm: '0' }, maxW: { sm: '[720px]' } })}>
            <Search size="inline" placeholder="City, neighborhood, or ZIP" value={criteria.location} sections={[]}
              onInputChange={val => onCriteria({ location: val })} onSearch={async () => {}} searchButtonStyleType="Ghost" />
          </div>
          <Button styleType={savedSearch ? 'Secondary' : 'Primary'} size="lg" startIcon={savedSearch ? <IconCheck size={3} /> : <IconHeart size={3} />} onClick={onSaveSearch}>
            {savedSearch ? 'Search saved' : 'Save search'}
          </Button>
          <div className={css({ flex: '1', display: { base: 'none', sm: 'block' } })} />
          <ContentSwitch size="lg">
            <ContentSwitch.Item selected={!mapView} onClick={() => setMapView(false)}>List</ContentSwitch.Item>
            <ContentSwitch.Item selected={mapView} onClick={() => setMapView(true)}>Map</ContentSwitch.Item>
          </ContentSwitch>
        </div>
      </div>
      <div className={css({ bg: 'bg.base', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base', px: { base: '500', sm: '700' }, py: '300', overflowX: 'auto' })}>
        <div className={hstack({ gap: '200', flexWrap: 'nowrap' })}>
          <Chip size="lg" startIcon={<IconFilter size={2} />}>Filters</Chip>
          {['Price', 'Rooms', 'Home type'].map(c => (
            <Chip key={c} size="lg" selected={chips.has(c)} onClick={() => toggleChip(c)}>
              <span className={hstack({ gap: '200' })}>{c} <IconChevronDown size={3} /></span>
            </Chip>
          ))}
          {FILTER_CHIPS.map(c => (
            <Chip key={c} size="lg" selected={chips.has(c)} showDismiss={chips.has(c)} onDismissClick={() => toggleChip(c)} onClick={() => toggleChip(c)}>{c}</Chip>
          ))}
        </div>
      </div>
      <div className={css({ px: { base: '500', sm: '700' }, py: '600' })}>
        <h1 className={css({ textStyle: 'headingMd', color: 'text.base', mb: '300' })}>Homes for sale in {criteria.location || 'your area'}</h1>
        <div className={hstack({ justifyContent: 'space-between', mb: '500', flexWrap: 'wrap', gap: '300' })}>
          <div className={hstack({ gap: '400' })}>
            <span className={css({ textStyle: 'bodySm', color: 'text.base', fontWeight: 'medium' })}>{results.length} Homes</span>
            <span className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>
              Sort by <Button styleType="Ghost" size="inline">Relevant listings <IconChevronDown size={2} /></Button>
            </span>
          </div>
          <Button styleType="Ghost" size="inline" startIcon={<IconCashReward size={3} />}>How much home can I afford?</Button>
        </div>
        {mapView
          ? <EmptyState title="Map view" body="The map is stubbed in this prototype. Switch back to List to browse homes." />
          : results.length
            ? <div className={cardGrid}>{results.map(l => <ListingCard key={l.id} {...cardProps(l, actions)} />)}</div>
            : <EmptyState title="No homes match" body="Try a higher price or fewer bedrooms." />}
      </div>
    </>
  )
}

function ListingsScreen({ savedOrder, savedSearches, tours, chatHomeIds, actions, onSearch, onRunSearch }: {
  savedOrder: string[]; savedSearches: SavedSearch[]; tours: Tour[]; chatHomeIds: string[]
  actions: CardActions; onSearch: () => void; onRunSearch: (s: SavedSearch) => void
}) {
  const saved = savedOrder.map(listingById)
  const [chip, setChip] = useState<string | null>(null)
  const chips: { id: string; label: string }[] = [
    { id: 'active', label: `Active (${saved.filter(l => l.status !== 'Pending').length})` },
    { id: 'price', label: 'Price change' },
    { id: 'pending', label: `Contingent/Pending (${saved.filter(l => l.status === 'Pending').length})` },
    { id: 'open', label: 'Open houses' },
    { id: 'chat', label: `Chat listings (${chatHomeIds.length})` },
    { id: 'notes', label: 'With notes' },
    { id: 'closed', label: 'Closed (0)' },
    { id: 'hidden', label: 'Hidden (0)' },
  ]
  const feed = chip === 'chat' ? chatHomeIds.map(listingById)
    : chip === 'pending' ? saved.filter(l => l.status === 'Pending')
      : chip === 'active' ? saved.filter(l => l.status !== 'Pending')
        : chip ? [] : saved
  const noHomes = <EmptyState title="No saved homes yet" body="Tap the heart on any home in Search and it shows up here. Georgia sees what you save." action={<Button styleType="Primary" size="sm" onClick={onSearch}>Go to Search</Button>} />
  return (
    <div className={css({ px: { base: '500', sm: '700' }, py: '600' })}>
      <h1 className={css({ textStyle: 'headingLg', color: 'text.base', mb: '400' })}>My listings</h1>
      <Tabs defaultValue="feed">
        <Tabs.List>
          <Tabs.Trigger value="feed">Feed</Tabs.Trigger>
          <Tabs.Trigger value="saved">Saved homes</Tabs.Trigger>
          <Tabs.Trigger value="searches">Saved searches</Tabs.Trigger>
          <Tabs.Trigger value="tours">Tour requests</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="feed">
          <div className={vstack({ alignItems: 'stretch', gap: '500', paddingY: '500' })}>
            <div className={hstack({ gap: '300', justifyContent: 'space-between', flexWrap: 'wrap' })}>
              <div className={wrap({ gap: '200' })}>
                {chips.map(c => <Chip key={c.id} size="sm" selected={chip === c.id} onClick={() => setChip(chip === c.id ? null : c.id)}>{c.label}</Chip>)}
              </div>
              <Button styleType="Ghost" size="inline">Last updated <IconChevronDown size={2} /></Button>
            </div>
            {feed.length ? (
              <section className={vstack({ alignItems: 'stretch', gap: '400' })}>
                <h2 className={css({ textStyle: 'headingSm', color: 'text.base' })}>{fmtGroupDate(new Date())}</h2>
                <div className={cardGrid}>{feed.map(l => <ListingCard key={l.id} {...cardProps(l, actions)} />)}</div>
              </section>
            ) : chip ? <EmptyState title="Nothing here yet" body="No homes match this filter." /> : noHomes}
          </div>
        </Tabs.Content>
        <Tabs.Content value="saved">
          <div className={css({ paddingY: '500' })}>
            {saved.length ? <div className={cardGrid}>{saved.map(l => <ListingCard key={l.id} {...cardProps(l, actions)} />)}</div> : noHomes}
          </div>
        </Tabs.Content>
        <Tabs.Content value="searches">
          <div className={vstack({ alignItems: 'stretch', gap: '300', paddingY: '500' })}>
            {savedSearches.length ? savedSearches.map(s => (
              <Card key={s.id} bordered spacing="0">
                <Card.Content className={hstack({ gap: '400', padding: '400' })}>
                  <div className={vstack({ alignItems: 'flex-start', gap: '100', flex: '1', minW: '0' })}>
                    <p className={css({ textStyle: 'bodyMd', fontWeight: 'semibold', color: 'text.base' })}>{s.name}</p>
                    <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>{matches(s.criteria).length} homes · Daily email alerts · Shared with {AGENT.first}</p>
                  </div>
                  <Button styleType="Secondary" size="sm" onClick={() => onRunSearch(s)}>View homes</Button>
                </Card.Content>
              </Card>
            )) : <EmptyState title="No saved searches" body="Save a search to hear about new matches first." action={<Button styleType="Primary" size="sm" onClick={onSearch}>Go to Search</Button>} />}
          </div>
        </Tabs.Content>
        <Tabs.Content value="tours">
          <div className={vstack({ alignItems: 'stretch', gap: '300', paddingY: '500' })}>
            {tours.length ? tours.map(t => <TourCard key={t.id} tour={t} />) : <EmptyState title="No tour requests" body="Choose Request tour on any home and Georgia will set it up." />}
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

function TourCard({ tour }: { tour: Tour }) {
  const home = listingById(tour.homeId)
  return (
    <Card bordered spacing="0">
      <Card.Content className={hstack({ gap: '400', padding: '300', alignItems: 'stretch' })}>
        <img src={home.photo} alt="" className={css({ w: '[120px]', h: '[88px]', borderRadius: '200', objectFit: 'cover', flexShrink: '0' })} />
        <div className={vstack({ alignItems: 'flex-start', gap: '100', flex: '1', minW: '0', justifyContent: 'center' })}>
          <p className={css({ textStyle: 'headingSm', color: 'text.base' })}>{fmtDay(tour.date)} · {tour.time}</p>
          <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>1 showing · {home.address1}, {home.address2}</p>
          <div className={hstack({ gap: '200', mt: '100' })}>
            <Tag dataColor="yellowSubtle">Requested</Tag>
            <span className={css({ textStyle: 'caption', color: 'text.alternate' })}>{AGENT.first} will confirm</span>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}

function ToursScreen({ tours, onRequest }: { tours: Tour[]; onRequest: () => void }) {
  return (
    <div className={css({ px: { base: '500', sm: '700' }, py: '600' })}>
      <h1 className={css({ textStyle: 'headingLg', color: 'text.base', mb: '400' })}>Tours</h1>
      <Tabs defaultValue="upcoming">
        <Tabs.List>
          <Tabs.Trigger value="upcoming">Upcoming{tours.length ? ` (${tours.length})` : ''}</Tabs.Trigger>
          <Tabs.Trigger value="past">Past (0)</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="upcoming">
          <div className={vstack({ alignItems: 'stretch', gap: '300', paddingY: '500' })}>
            {tours.map(t => <TourCard key={t.id} tour={t} />)}
            <EmptyState
              title={tours.length ? 'Want to see another home?' : 'No showings yet'}
              body={`Request a tour and ${AGENT.first} will book the showing.`}
              action={<Button styleType="Secondary" size="sm" onClick={onRequest}>Request a tour</Button>}
            />
          </div>
        </Tabs.Content>
        <Tabs.Content value="past">
          <div className={css({ paddingY: '500' })}><EmptyState title="No past tours" body="Homes you’ve toured show up here with your notes." /></div>
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

function MyHomeScreen({ home, onAdd }: { home: OwnedHome | null; onAdd: () => void }) {
  const [view, setView] = useState<'public' | 'owner'>('owner')
  const [prep, setPrep] = useState('0')
  const [commission, setCommission] = useState('3.00')
  const [transfer, setTransfer] = useState('1.00')
  if (!home) {
    return (
      <div className={css({ px: { base: '500', sm: '700' }, py: '600' })}>
        <h1 className={css({ textStyle: 'headingLg', color: 'text.base', mb: '500' })}>My Home</h1>
        <EmptyState title="Track your home’s value" body="Add a home you own to see its RealEstimate℠, what you could make if you sell, and ways to save."
          action={<Button styleType="Primary" size="sm" startIcon={<IconHome size={2} />} onClick={onAdd}>Add your home</Button>} />
      </div>
    )
  }
  const commissionAmt = HOME_VALUE * (Number(commission) || 0) / 100
  const transferAmt = HOME_VALUE * (Number(transfer) || 0) / 100
  const sellingCosts = commissionAmt + transferAmt + (Number(prep) || 0)
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '600', px: { base: '500', sm: '700' }, py: '600', maxW: '[1120px]' })}>
      <div className={hstack({ gap: '400', justifyContent: 'space-between', flexWrap: 'wrap' })}>
        <SelectInput aria-label="Your homes" value={home.address} onChange={() => {}} options={[{ text: home.address, value: home.address }]} className={css({ minW: '[320px]' })} />
        <ContentSwitch size="sm">
          <ContentSwitch.Item selected={view === 'public'} onClick={() => setView('public')}>Public View</ContentSwitch.Item>
          <ContentSwitch.Item selected={view === 'owner'} onClick={() => setView('owner')}>Owner View</ContentSwitch.Item>
        </ContentSwitch>
      </div>
      <InlineMessage styleType="info" title="Is this your home?">Verify ownership to unlock your full home profile and share it with {AGENT.first}.</InlineMessage>
      <div className={vstack({ alignItems: 'flex-start', gap: '200' })}>
        <h1 className={css({ textStyle: 'displaySm', color: 'text.base' })}>Welcome home!</h1>
        <p className={css({ textStyle: 'bodyMd', color: 'text.alternate' })}>RealEstimate℠</p>
        <p className={css({ textStyle: 'headingLg', color: 'text.base' })}>{fmtPrice(HOME_VALUE)}</p>
        <div className={hstack({ gap: '300', flexWrap: 'wrap' })}>
          <span className={css({ textStyle: 'bodySm', color: 'text.base' })}>3 bed · 2 bath · 2,148 sqft</span>
          <Tag dataColor="yellowSubtle">Details missing</Tag>
          <Button styleType="Ghost" size="inline">Update & unlock</Button>
        </div>
        <Button styleType="Secondary" size="sm">Edit home profile</Button>
      </div>
      <Tabs defaultValue="sell">
        <Tabs.List>
          <Tabs.Trigger value="sell">Prepare to sell</Tabs.Trigger>
          <Tabs.Trigger value="value">Market value</Tabs.Trigger>
          <Tabs.Trigger value="reno">Renovations</Tabs.Trigger>
          <Tabs.Trigger value="save">Ways to save</Tabs.Trigger>
          <Tabs.Trigger value="host">Host or rent</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="sell">
          <div className={grid({ columns: { base: 1, md: 2 }, gap: '600', paddingY: '500' })}>
            <div className={vstack({ alignItems: 'stretch', gap: '300', padding: '500', bg: 'bg.alternate', borderRadius: '300' })}>
              <p className={css({ textStyle: 'bodyMd', color: 'text.alternate' })}>Estimated proceeds</p>
              <p className={css({ textStyle: 'displaySm', color: 'text.base' })}>{fmtPrice(HOME_VALUE - sellingCosts)}</p>
              <div className={hstack({ justifyContent: 'space-between' })}><span className={css({ textStyle: 'bodySm' })}>Estimated equity</span><span className={css({ textStyle: 'bodySm', fontWeight: 'semibold' })}>{fmtPrice(HOME_VALUE)}</span></div>
              <div className={hstack({ justifyContent: 'space-between' })}><span className={css({ textStyle: 'bodySm' })}>Selling costs</span><span className={css({ textStyle: 'bodySm', fontWeight: 'semibold' })}>-{fmtPrice(sellingCosts)}</span></div>
            </div>
            <div className={vstack({ alignItems: 'stretch', gap: '400' })}>
              <TextInput label="Preparation and repair costs" type="number" value={prep} onChange={(e: InputEvt) => setPrep(e.target.value)} />
              <div className={grid({ columns: 2, gap: '400' })}>
                <TextInput label="Commission amount" value={fmtPrice(commissionAmt)} readOnly />
                <TextInput label="Commission rate (%)" type="number" value={commission} onChange={(e: InputEvt) => setCommission(e.target.value)} />
                <TextInput label="Transfer tax amount" value={fmtPrice(transferAmt)} readOnly />
                <TextInput label="Transfer tax rate (%)" type="number" value={transfer} onChange={(e: InputEvt) => setTransfer(e.target.value)} />
              </div>
              <Button styleType="Primary" size="sm" className={css({ alignSelf: 'flex-start' })}>Calculate</Button>
            </div>
          </div>
        </Tabs.Content>
        {(['value', 'reno', 'save', 'host'] as const).map(v => (
          <Tabs.Content key={v} value={v}>
            <div className={css({ paddingY: '500' })}><EmptyState title="Coming soon" body="This tab is stubbed in the prototype." /></div>
          </Tabs.Content>
        ))}
      </Tabs>
      <section className={vstack({ alignItems: 'stretch', gap: '400' })}>
        <h2 className={css({ textStyle: 'headingMd', color: 'text.base' })}>Your next home</h2>
        <Card bordered spacing="0" className={css({ maxW: '[360px]' })}>
          <Card.Content className={vstack({ alignItems: 'flex-start', gap: '200', padding: '500' })}>
            <IconCashReward size={4} />
            <p className={css({ textStyle: 'headingSm', color: 'text.base' })}>What can I afford?</p>
            <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>Use your equity to see a budget for your next home.</p>
          </Card.Content>
        </Card>
      </section>
    </div>
  )
}

// ─── Onboarding modal ─────────────────────────────────────────────────────────

// The flow frame, mirrored from the agent app: a top-aligned Haven Modal with
// progress + Finish later, the step heading, the step, and an optional aside.
function OnboardingFlow({
  open, seq, idx, title, ctaLabel, onBack, onSkip, onContinue, onFinishLater, onDismiss, onAfterClose, aside, children,
}: {
  open: boolean; seq: StepKey[]; idx: number; title: string; ctaLabel: string
  onBack: () => void; onSkip: () => void; onContinue: () => void; onFinishLater: () => void
  onDismiss: () => void; onAfterClose: (e: Event) => void; aside: React.ReactNode | null; children: React.ReactNode
}) {
  const def = STEP_DEFS[seq[idx]]
  const multi = seq.length > 1
  // On each step change, move focus to the new step's heading.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepId = `${seq.join(',')}:${idx}`
  const prevStep = useRef(stepId)
  useEffect(() => {
    if (prevStep.current === stepId) return
    prevStep.current = stepId
    headingRef.current?.focus()
  }, [stepId])
  const body = (
    <div className={vstack({ alignItems: 'stretch', gap: '600', minW: '0' })}>
      <div className={vstack({ alignItems: 'flex-start', gap: '200' })}>
        <h3 ref={headingRef} tabIndex={-1} className={css({ textStyle: 'headingMd', color: 'text.base', outline: 'none' })}>{def.title}</h3>
        <p className={css({ textStyle: 'bodyMd', color: 'text.alternate' })}>{def.sub}</p>
      </div>
      {children}
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
          {aside
            ? <div className={grid({ gridTemplateColumns: { base: '1fr', md: '[minmax(0, 1fr) 288px]' }, gap: '600', alignItems: 'start' })}>{body}{aside}</div>
            : body}
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

// Stands in for the agent app's RealAssist™ aside: a message from the agent with
// one-tap replies. It's optional; every step works without it.
function AgentAside({ children }: { children: React.ReactNode }) {
  return (
    <aside aria-label={`Message from ${AGENT.name}`}
      className={vstack({ alignItems: 'stretch', gap: '400', padding: '500', borderRadius: '300', bg: 'bg.base', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', position: 'sticky', top: '0' })}>
      <div className={hstack({ gap: '300' })}>
        <AgentAvatar size="sm" />
        <div className={vstack({ alignItems: 'flex-start', gap: '0' })}>
          <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.base' })}>{AGENT.name}</p>
          <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>Your agent · {AGENT.brokerage}</p>
        </div>
      </div>
      {children}
    </aside>
  )
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const mine = msg.from === 'me'
  return (
    <div className={css({ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' })}>
      <div className={css({ maxW: '[90%]', paddingX: '400', paddingY: '300', textStyle: 'bodySm', color: 'text.base', borderRadius: '200', bg: mine ? 'blue.100' : 'bg.alternate' })}>
        {msg.text}
        {msg.homeId && <HomeSnippet home={listingById(msg.homeId)} />}
      </div>
    </div>
  )
}

// ── Step 1 · Meet your agent ──
function AgentStep({ profile, onChange, attempted }: { profile: Profile; onChange: (p: Partial<Profile>) => void; attempted: boolean }) {
  const missing = (v: string) => attempted && !v.trim()
  return (
    <>
      <Card bordered spacing="0">
        <Card.Content className={hstack({ gap: '400', padding: '500', alignItems: 'flex-start' })}>
          <AgentAvatar size="lg" />
          <div className={vstack({ alignItems: 'flex-start', gap: '100', flex: '1', minW: '0' })}>
            <p className={css({ textStyle: 'headingSm', color: 'text.base' })}>{AGENT.name}</p>
            <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>{AGENT.brokerage} · Scottsdale, AZ</p>
            <p className={css({ textStyle: 'bodySm', color: 'text.base' })}>{AGENT.phone} · {AGENT.email}</p>
          </div>
          <Tag dataColor="greenSubtle">Connected</Tag>
        </Card.Content>
      </Card>
      <StepSection title="Your details">
        <div className={grid({ columns: { base: 1, sm: 2 }, gap: '500' })}>
          <TextInput label="Full name" required autoComplete="name" value={profile.name}
            onChange={(e: InputEvt) => onChange({ name: e.target.value })} error={missing(profile.name)} errorText="Enter your name" />
          <TextInput label="Email" required type="email" autoComplete="email" value={profile.email}
            onChange={(e: InputEvt) => onChange({ email: e.target.value })} error={missing(profile.email)} errorText="Enter your email" />
          <TextInput label="Mobile phone" type="tel" autoComplete="tel" value={profile.phone}
            helperText={`Optional. Lets ${AGENT.first} text you about showings.`}
            onChange={(e: InputEvt) => onChange({ phone: e.target.value })} />
        </div>
      </StepSection>
    </>
  )
}

// ── Step 2 · Search + save homes ──
function SearchStep({ criteria, onCriteria, saveSearch, onSaveSearch, actions }: {
  criteria: SearchCriteria; onCriteria: (c: Partial<SearchCriteria>) => void
  saveSearch: boolean; onSaveSearch: (on: boolean) => void; actions: CardActions
}) {
  const results = matches(criteria).slice(0, 6)
  return (
    <>
      <div className={grid({ columns: { base: 1, sm: 3 }, gap: '500' })}>
        <TextInput label="Location" value={criteria.location} onChange={(e: InputEvt) => onCriteria({ location: e.target.value })} />
        <SelectInput label="Max price" value={criteria.maxPrice} options={PRICE_OPTIONS} onChange={e => onCriteria({ maxPrice: e.target.value })} />
        <SelectInput label="Bedrooms" value={criteria.minBeds} options={BEDS_OPTIONS} onChange={e => onCriteria({ minBeds: e.target.value })} />
      </div>
      <Checkbox checked={saveSearch} onChange={(_e, on) => onSaveSearch(on)}>
        Save this search and email me new matches
      </Checkbox>
      <StepSection title={`${matches(criteria).length} homes match · tap the heart to save`}>
        {results.length
          ? <div className={grid({ columns: { base: 1, sm: 2, md: 3 }, gap: '400' })}>{results.map(l => <ListingCard key={l.id} {...cardProps(l, actions)} />)}</div>
          : <EmptyState title="No homes match" body="Try a higher price or fewer bedrooms." />}
      </StepSection>
      <p aria-live="polite" className={css({ textStyle: 'caption', color: 'text.alternate' })}>{actions.saved.size} saved</p>
    </>
  )
}

// ── Step 3 · Request a tour ──
function TourStep({ draft, onChange, attempted, savedIds, onCalendarToggle }: {
  draft: TourDraft; onChange: (d: Partial<TourDraft>) => void; attempted: boolean; savedIds: string[]
  onCalendarToggle: (open: boolean) => void
}) {
  // Saved homes first, then the rest of the search results.
  const homes = [...savedIds.map(listingById), ...LISTINGS.filter(l => !savedIds.includes(l.id))].slice(0, 5)
  return (
    <>
      <Fieldset label="Home" required error={attempted && !draft.homeId} errorText="Choose a home"
        helperText={savedIds.length ? 'Your saved homes are listed first.' : undefined}>
        <div className={vstack({ alignItems: 'stretch', gap: '0', borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '200' })}>
          {homes.map(h => (
            <div key={h.id} className={hstack({ gap: '300', paddingX: '400', paddingY: '300', borderBottomWidth: '100', borderBottomStyle: 'solid', borderColor: 'border.base', _last: { borderBottomWidth: '0' } })}>
              <Radio name="tour-home" value={h.id} checked={draft.homeId === h.id} onChange={() => onChange({ homeId: h.id })}>
                {h.address1} <span className={css({ color: 'text.alternate' })}>· {fmtPrice(h.price)}</span>
              </Radio>
              <div className={css({ flex: '1' })} />
              {savedIds.includes(h.id) && <Tag dataColor="gray">Saved</Tag>}
            </div>
          ))}
        </div>
      </Fieldset>
      <div className={grid({ columns: { base: 1, sm: 2 }, gap: '500' })}>
        <DatePicker label="Date" required value={draft.date} minDate={startOfToday()}
          onChange={date => onChange({ date })} error={attempted && !draft.date} errorText="Choose a date"
          onCalendarOpen={() => onCalendarToggle(true)} onCalendarClose={() => onCalendarToggle(false)} />
        <SelectInput label="Time" required value={draft.time}
          options={[{ text: 'Choose a time', value: '', hidden: true }, ...TIME_OPTIONS]}
          onChange={e => onChange({ time: e.target.value })} error={attempted && !draft.time} errorText="Choose a time" />
      </div>
      <TextInput label={`Note for ${AGENT.first}`} value={draft.note} helperText="Optional"
        onChange={(e: InputEvt) => onChange({ note: e.target.value })} />
    </>
  )
}

// ── Step 4 · Set up My Home ──
function HomeStep({ owns, onOwns, address, onAddress, attempted }: {
  owns: 'yes' | 'no' | null; onOwns: (v: 'yes' | 'no') => void; address: string; onAddress: (v: string) => void; attempted: boolean
}) {
  return (
    <>
      <Fieldset label="Do you own a home right now?">
        <div className={vstack({ alignItems: 'flex-start', gap: '300' })}>
          <Radio name="owns" value="yes" checked={owns === 'yes'} onChange={() => onOwns('yes')}>Yes, I own a home</Radio>
          <Radio name="owns" value="no" checked={owns === 'no'} onChange={() => onOwns('no')}>No, not right now</Radio>
        </div>
      </Fieldset>
      {owns === 'yes' && (
        <div className={vstack({ alignItems: 'stretch', gap: '300' })}>
          <TextInput label="Home address" required autoComplete="street-address" value={address}
            onChange={(e: InputEvt) => onAddress(e.target.value)} error={attempted && !address.trim()} errorText="Enter your home’s address" />
          {!address && (
            <div className={wrap({ gap: '200', alignItems: 'center' })}>
              <span className={css({ textStyle: 'caption', color: 'text.alternate' })}>Found in public records:</span>
              <Chip size="sm" startIcon={<IconHome size={2} />} onClick={() => onAddress(HOME_SUGGESTION)}>{HOME_SUGGESTION}</Chip>
            </div>
          )}
          {address.trim() && (
            <InlineMessage styleType="success" title={`RealEstimate℠ ${fmtPrice(HOME_VALUE)}`}>
              Track this value in My Home and see what you could make if you sell.
            </InlineMessage>
          )}
        </div>
      )}
      {owns === 'no' && (
        <InlineMessage styleType="neutral" title="No problem">You can add a home any time from My Home.</InlineMessage>
      )}
    </>
  )
}

// ─── Setup checklist ──────────────────────────────────────────────────────────

function ProgressRing({ done, total, size = 28 }: { done: number; total: number; size?: number }) {
  const r = (size - 3) / 2
  const c = 2 * Math.PI * r
  const m = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={css({ flexShrink: '0' })}>
      <circle cx={m} cy={m} r={r} fill="none" strokeWidth="3" className={css({ stroke: 'text.inverse', opacity: '0.25' })} />
      <circle cx={m} cy={m} r={r} fill="none" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} transform={`rotate(-90 ${m} ${m})`}
        className={css({ stroke: 'green.600' })} />
    </svg>
  )
}

function StatusCircle({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return <span aria-hidden className={circle({ size: '[20px]', flexShrink: '0', bg: 'status.success', color: 'text.inverse' })}><IconCheck size={1.5} /></span>
  }
  return <span aria-hidden className={css({ w: '[20px]', h: '[20px]', flexShrink: '0', borderRadius: 'circle', borderWidth: '[2px]', borderStyle: 'solid', borderColor: status === 'skipped' ? 'status.warning' : 'border.base' })} />
}

function SetupChecklist({ status, onOpen, onDismiss, focusRef }: {
  status: Record<StepKey, StepStatus>; onOpen: (k: StepKey) => void; onDismiss: () => void; focusRef: React.Ref<HTMLDivElement>
}) {
  const [expanded, setExpanded] = useState(false)
  const done = TASKS.filter(t => status[t] === 'done').length
  const allDone = done === TASKS.length
  const next = TASKS.find(t => status[t] !== 'done')
  const verb = (k: StepKey) => (status[k] === 'skipped' ? 'Resume' : 'Start')
  return (
    <div ref={focusRef} tabIndex={-1} role="region" aria-label="Setup checklist"
      className={css({ px: { base: '500', sm: '700' }, py: '300', outline: 'none' })}>
      <div className={css({ borderWidth: '100', borderStyle: 'solid', borderColor: 'border.base', borderRadius: '200', overflow: 'hidden' })}>
        <div className={hstack({ gap: '400', minH: '[52px]', paddingY: '300', paddingLeft: '500', paddingRight: '300', bg: 'bg.inverse', color: 'text.inverse' })}>
          <ProgressRing done={done} total={TASKS.length} />
          <div className={css({ flex: '1', minW: '0' })}>
            <p className={css({ textStyle: 'bodySm', fontWeight: 'semibold', color: 'text.inverse', truncate: true })}>
              {allDone ? 'You’re all set' : 'Finish setting up Realtor.com+'}
            </p>
            <p className={css({ textStyle: 'caption', color: 'text.inverse', opacity: '0.8', truncate: true })}>
              {done} of {TASKS.length} done{next ? ` · Next: ${STEP_DEFS[next].task}` : ''}
            </p>
          </div>
          {allDone
            ? <Button styleType="Primary" size="sm" inverse onClick={onDismiss}>Dismiss</Button>
            : next && <Button styleType="Primary" size="sm" inverse aria-label={`${verb(next)}: ${STEP_DEFS[next].task}`} onClick={() => onOpen(next)}>{verb(next)}</Button>}
          <Button styleType="Ghost" size="sm" inverse aria-expanded={expanded} aria-controls="setup-checklist-tasks"
            aria-label={expanded ? 'Collapse checklist' : 'Expand checklist'}
            iconOnly={expanded ? <IconChevronUp size={2} /> : <IconChevronDown size={2} />} onClick={() => setExpanded(e => !e)} />
          {!allDone && <Button styleType="Ghost" size="sm" inverse aria-label="Hide checklist" iconOnly={<IconClose size={2} />} onClick={onDismiss} />}
        </div>
        {expanded && (
          <ul id="setup-checklist-tasks" className={css({ listStyle: 'none', m: '0', p: '0' })}>
            {TASKS.map(k => {
              const s = status[k]
              return (
                <li key={k} className={hstack({ gap: '400', paddingX: '500', paddingY: '300', minH: '[44px]', borderTopWidth: '100', borderTopStyle: 'solid', borderColor: 'border.base' })}>
                  <StatusCircle status={s} />
                  <span className={css({ flex: '1', minW: '0', textStyle: 'bodySm', color: s === 'done' ? 'text.alternate' : 'text.base', textDecoration: s === 'done' ? 'line-through' : 'none', fontWeight: k === next ? 'semibold' : 'normal' })}>
                    {STEP_DEFS[k].task}
                    <span className={css({ srOnly: true })}>{s === 'done' ? ' (done)' : s === 'skipped' ? ' (skipped)' : ''}</span>
                  </span>
                  {s === 'skipped' && <Tag dataColor="yellowSubtle">Skipped</Tag>}
                  {s !== 'done' && (
                    <Button styleType={k === next ? 'Primary' : 'Tertiary'} size="sm" aria-label={`${verb(k)}: ${STEP_DEFS[k].task}`} onClick={() => onOpen(k)}>{verb(k)}</Button>
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

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function Shell({ locked = false }: { locked?: boolean }) {
  const [active, setActive] = useState<NavId>('search')

  // ── Consumer data ──
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE)
  const [criteria, setCriteria] = useState<SearchCriteria>(INITIAL_CRITERIA)
  const [savedOrder, setSavedOrder] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [saveSearchOpt, setSaveSearchOpt] = useState(true)
  const [tours, setTours] = useState<Tour[]>([])
  const [draft, setDraft] = useState<TourDraft>(EMPTY_DRAFT)
  const [owns, setOwns] = useState<'yes' | 'no' | null>(null)
  const [address, setAddress] = useState('')
  const [ownedHome, setOwnedHome] = useState<OwnedHome | null>(null)

  // ── Chat ──
  const [chat, setChat] = useState<ChatMsg[]>(CHAT_SEED)
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const chatOpenRef = useRef(false)
  chatOpenRef.current = chatOpen
  const replyTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(replyTimer.current), [])

  // ── Onboarding state ── `seq` is the run of steps the modal walks (all four on first
  // run; the remaining ones when reopened from the checklist), `idx` the current one.
  const [flowOpen, setFlowOpen] = useState(true)
  const [seq, setSeq] = useState<StepKey[]>(TASKS)
  const [idx, setIdx] = useState(0)
  const [taskMode, setTaskMode] = useState(false)
  const [tourInRun, setTourInRun] = useState(false)
  const [status, setStatus] = useState<Record<StepKey, StepStatus>>(INITIAL_STATUS)
  const [attempted, setAttempted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const checklistRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  // The DatePicker's calendar shares the modal's portal, so Escape reaches the Modal too.
  const calendarOpen = useRef(false)

  const key = seq[idx]
  const multi = seq.length > 1
  const firstName = profile.name.trim().split(' ')[0] || 'there'
  const saved = new Set(savedOrder)
  const touredIds = new Set(tours.map(t => t.homeId))
  const chatHomeIds = [...new Set(chat.filter(m => m.homeId).map(m => m.homeId!))]
  const searchSaved = savedSearches.some(s => describe(s.criteria) === describe(criteria))

  // ── Chat actions ──
  function agentSays(msg: ChatMsg, delay = 700) {
    window.clearTimeout(replyTimer.current)
    replyTimer.current = window.setTimeout(() => {
      setChat(c => [...c, msg])
      if (!chatOpenRef.current) setUnread(u => u + 1)
    }, delay)
  }
  function sendChat(text: string, reply = 'Thanks! I’ll get back to you shortly.', homeId?: string) {
    setChat(c => [...c, { from: 'me', text, homeId }])
    agentSays({ from: 'agent', text: reply })
  }
  function shareToChat(id: string) {
    const l = listingById(id)
    sendChat('What do you think of this one?', `Good pick. ${l.address1} has a great layout. Want me to set up a tour?`, id)
    if (!flowOpen) { setChatOpen(true); setUnread(0) }
  }
  const openChat = () => { setChatOpen(true); setUnread(0) }

  // ── Listing actions ──
  function toggleSave(id: string) {
    setSavedOrder(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev]))
  }
  function addSavedSearch(c: SearchCriteria) {
    setSavedSearches(prev => (prev.some(s => describe(s.criteria) === describe(c)) ? prev : [...prev, { id: `s${Date.now()}`, name: describe(c), criteria: c }]))
  }
  function requestTour(id: string) {
    setDraft(d => ({ ...d, homeId: id }))
    if (flowOpen) { if (key !== 'tour') goTo(seq.indexOf('tour') >= 0 ? seq.indexOf('tour') : idx) } else openTask('tour')
  }
  const actions: CardActions = { saved, toggleSave, shareToChat, touredIds, requestTour }

  // ── Step status ── Skipping never downgrades a step that's already done.
  function markStep(k: StepKey, s: StepStatus) {
    setStatus(prev => ({ ...prev, [k]: prev[k] === 'done' && s === 'skipped' ? 'done' : s }))
  }
  function engaged(k: StepKey) {
    if (k === 'search') return savedOrder.length > 0 || saveSearchOpt
    if (k === 'home') return owns !== null
    return true
  }
  function valid(k: StepKey) {
    if (k === 'agent') return !!(profile.name.trim() && profile.email.trim())
    if (k === 'tour') return !!(draft.homeId && draft.date && draft.time)
    if (k === 'home') return owns !== 'yes' || !!address.trim()
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
    if (key === 'search' && saveSearchOpt) addSavedSearch(criteria)
    if (key === 'tour') {
      const home = listingById(draft.homeId)
      setTours(t => [...t, { id: `t${Date.now()}`, homeId: draft.homeId, date: draft.date!, time: draft.time, note: draft.note }])
      sendChat(`I’d like to tour ${home.address1} on ${fmtDay(draft.date!)} at ${draft.time}.${draft.note ? ` ${draft.note}` : ''}`,
        `Got it! I’ll confirm ${fmtDay(draft.date!)} at ${draft.time} with the listing agent and let you know.`, draft.homeId)
      setDraft(EMPTY_DRAFT)
      setTourInRun(true)
      created = true
    }
    if (key === 'home' && owns === 'yes') setOwnedHome({ address: address.trim() })
    markStep(key, engaged(key) ? 'done' : 'skipped')
    next(created)
  }
  function onSkip() { markStep(key, 'skipped'); next() }
  function onBack() { if (idx > 0) goTo(idx - 1) }

  // Flow end (Finish, Finish later, ✕, Escape). First run lands on Tours if a tour
  // was requested, else My Listings if homes were saved, else Search. A checklist
  // re-run lands on the screen its step fills in.
  function finish(justCreatedTour = false) {
    const created = justCreatedTour || tourInRun
    setFlowOpen(false)
    if (created) setActive('tours')
    else if (taskMode) setActive(key === 'home' && (owns === 'yes') ? 'home' : key === 'search' ? 'listings' : active)
    else setActive(savedOrder.length ? 'listings' : 'search')
  }
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
    setChatOpen(false)
    setFlowOpen(true)
  }

  const flowTitle = taskMode ? (multi ? 'Finish setting up Realtor.com+' : STEP_DEFS[key].task) : `Welcome to Realtor.com+, ${firstName}`
  const ctaLabel = key === 'tour' ? 'Request tour' : taskMode && !multi ? 'Done' : idx === seq.length - 1 ? 'Finish' : 'Continue'
  const used = new Set(chat.filter(m => m.from === 'me').map(m => m.text))

  let aside: React.ReactNode = null
  if (key === 'agent') {
    const recent = chat.slice(-3)
    aside = (
      <AgentAside>
        <div aria-live="polite" className={vstack({ alignItems: 'stretch', gap: '200' })}>
          {recent.map((m, i) => <Bubble key={chat.length - recent.length + i} msg={m} />)}
        </div>
        <div className={wrap({ gap: '200' })}>
          {QUICK_REPLIES.filter(q => !used.has(q.text)).map(q => (
            <Chip key={q.label} size="sm" onClick={() => sendChat(q.text, q.reply)}>{q.label}</Chip>
          ))}
        </div>
        <p className={css({ textStyle: 'caption', color: 'text.alternate' })}>Optional. Your chat continues under Chat in the top bar.</p>
      </AgentAside>
    )
  } else if (key === 'tour') {
    const sat = nextSaturday()
    const suggested = draft.date?.getTime() === sat.getTime() && draft.time === '10:00 AM'
    aside = (
      <AgentAside>
        <Bubble msg={{ from: 'agent', text: `I’m free ${fmtDay(sat)} at 10:00 AM if that works for you.` }} />
        {suggested
          ? <p aria-live="polite" className={css({ textStyle: 'caption', color: 'text.alternate' })}>Added. Choose Request tour to send it.</p>
          : <Button styleType="Secondary" size="sm" onClick={() => setDraft(d => ({ ...d, date: sat, time: '10:00 AM' }))}>Use {fmtDay(sat)}, 10:00 AM</Button>}
      </AgentAside>
    )
  }

  return (
    <div className={vstack({ minH: '[100dvh]', alignItems: 'stretch', gap: '0' })}>
      <Header
        active={active} onNavigate={setActive}
        chat={chat} chatOpen={chatOpen} onChatOpen={openChat} onChatClose={() => setChatOpen(false)}
        onSend={t => sendChat(t)} unread={unread}
        initials={profile.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      />
      <main ref={mainRef} tabIndex={-1} className={css({ flex: '1', w: 'full', outline: 'none' })}>
        {!flowOpen && !dismissed && <SetupChecklist status={status} onOpen={openTask} onDismiss={() => setDismissed(true)} focusRef={checklistRef} />}
        {active === 'search' && (
          <SearchScreen criteria={criteria} onCriteria={c => setCriteria(p => ({ ...p, ...c }))}
            savedSearch={searchSaved} onSaveSearch={() => addSavedSearch(criteria)} actions={actions} />
        )}
        {active === 'listings' && (
          <ListingsScreen savedOrder={savedOrder} savedSearches={savedSearches} tours={tours} chatHomeIds={chatHomeIds}
            actions={actions} onSearch={() => setActive('search')} onRunSearch={s => { setCriteria(s.criteria); setActive('search') }} />
        )}
        {active === 'tours' && <ToursScreen tours={tours} onRequest={() => openTask('tour')} />}
        {active === 'home' && <MyHomeScreen home={ownedHome} onAdd={() => openTask('home')} />}
      </main>
      <footer className={css({ bg: 'bg.inverse', px: { base: '500', sm: '700' }, py: '600' })}>
        <p className={css({ textStyle: 'caption', color: 'text.inverse', opacity: '0.7' })}>
          © {new Date().getFullYear()} Move, Inc. Realtor.com+ consumer onboarding prototype.
        </p>
      </footer>

      <OnboardingFlow
        open={flowOpen && !locked} seq={seq} idx={idx} title={flowTitle} ctaLabel={ctaLabel}
        onBack={onBack} onSkip={onSkip} onContinue={onContinue}
        onFinishLater={() => finish()} onDismiss={() => { if (!calendarOpen.current) finish() }} onAfterClose={onModalClosed}
        aside={ASIDE_STEPS.includes(key) ? aside : null}
      >
        {key === 'agent' && <AgentStep profile={profile} onChange={p => setProfile(prev => ({ ...prev, ...p }))} attempted={attempted} />}
        {key === 'search' && (
          <SearchStep criteria={criteria} onCriteria={c => setCriteria(p => ({ ...p, ...c }))}
            saveSearch={saveSearchOpt} onSaveSearch={setSaveSearchOpt} actions={actions} />
        )}
        {key === 'tour' && (
          <TourStep draft={draft} onChange={d => setDraft(prev => ({ ...prev, ...d }))} attempted={attempted} savedIds={savedOrder}
            onCalendarToggle={o => { calendarOpen.current = o }} />
        )}
        {key === 'home' && <HomeStep owns={owns} onOwns={setOwns} address={address} onAddress={setAddress} attempted={attempted} />}
      </OnboardingFlow>
    </div>
  )
}
