// ─── The five "Getting started" tours ─────────────────────────────────────────
// A tour is an ordered list of stops. Each stop points at a real workspace element
// (`data-tour="…"`) and may:
//   enter  — workspace state to apply on arrival (switch a tab, close a sheet)
//   until  — an action the agent must do in the real UI before the tour moves on.
//            Next is hidden, the hint shows, and the stop advances automatically.
//   manual — keep Next (disabled until `until` is met); Show me acts and advances.
//
// Copy follows the Realtor.com+ "Agents: Getting started" support article and its
// linked how-to articles (Invite a client, Chat, Client activity, Tours): product
// name Realtor.com+, "Client activity" (top right of the client feed), "Chat", and
// invites by first/last name + email, mobile optional. RealAssist™ AI isn't covered by the article, so tour 4
// keeps the brief's copy.

export type Place = 'right' | 'left' | 'bottom' | 'bottom-end' | 'top'
// The right-docked panel. Chat is a floating window; Schedule a tour and Invite client
// are modals.
export type Sheet = 'assist' | null
export type Route = 'clients' | 'search' | 'tours'
export type DetailTab = 'homes' | 'activity'
export type ClientTab = 'Active' | 'Invited' | 'Requests'

export type Condition =
  | 'feedMenuOpen' | 'chatOpen' | 'chatSent' | 'scheduleOpen' | 'homesPicked' | 'slotPicked' | 'tourBooked'
  | 'assistOpen' | 'assistAsked' | 'addOpen' | 'invited'

export type Enter = Partial<{ sheet: Sheet; detailTab: DetailTab; clientTab: ClientTab; chatOpen: boolean }>

export type Stop = {
  target: string
  place: Place
  title: string
  body: string
  enter?: Enter
  until?: Condition
  hint?: string
  manual?: boolean
}

export type TourId = 'workspace' | 'sample' | 'schedule' | 'assist' | 'clients'
export type Tour = { id: TourId; title: string; mins: string; stops: Stop[] }

export const TOURS: Tour[] = [
  {
    id: 'workspace', title: 'Tour your workspace', mins: '1 min', stops: [
      { target: 'rail', place: 'right', title: 'Your workspace', body: 'Clients, Search, and Tours live in this rail, with Support, Alerts, and Chat below. Most of your day starts with a client.' },
      { target: 'clientlist', place: 'right', title: 'Your clients', body: 'Clients show up here once they accept your invite. Alex Rivera is a sample client we added so you can practice.' },
      { target: 'clienthead', place: 'bottom', title: 'Everything about a client', body: 'Budget, saved search, and the next thing to do. Schedule a tour right from here, or open Client activity at the top right.' },
      { target: 'askra', place: 'bottom-end', title: 'RealAssist™ AI', body: 'Ask for a daily catch-up, a tour plan, or a message draft. It docks on the right whenever you need it.' },
    ],
  },
  {
    id: 'sample', title: 'Explore your sample client', mins: '2 min', stops: [
      { target: 'feedtiles', place: 'bottom', enter: { detailTab: 'homes' }, title: 'Saves, tour requests, and searches', body: 'Saved & Tour requests counts the homes Alex saved and the tours Alex asked for. Saved Searches are the searches that send Alex new listings automatically.' },
      { target: 'thisweek', place: 'top', enter: { detailTab: 'homes' }, title: 'Alex’s feed', body: 'Each client has a feed: listings from their saved searches and homes you share, newest first. Homes Alex saves are marked Saved. Use the filters above to narrow it down.' },
      { target: 'activitytab', place: 'bottom-end', enter: { detailTab: 'activity' }, title: 'What Alex is up to', body: 'Client activity shows Alex’s views, saves, searches, and hidden homes, newest first. Use it to time your next message.' },
      { target: 'feedtitle', place: 'bottom', until: 'feedMenuOpen', title: 'Open Alex’s feed', body: 'Choose the client’s name to see who’s in the feed and what you can do, including Chat.', hint: 'Choose Alex Rivera to continue' },
      { target: 'feedchat', place: 'right', until: 'chatOpen', title: 'Chat with Alex', body: 'Your conversation with each client lives in one thread. You can also open Chat from the left rail.', hint: 'Choose Chat to continue' },
      { target: 'chatchips', place: 'left', until: 'chatSent', title: 'Try a quick reply', body: 'Pick a suggestion or type your own. Alex is a sample, so nothing is sent.', hint: 'Send a message to continue' },
      { target: 'chatthread', place: 'left', title: 'Alex replied', body: 'Replies land here and in Chat on the left rail, and you’ll get a notification.' },
    ],
  },
  {
    id: 'schedule', title: 'Schedule a tour', mins: '1 min', stops: [
      { target: 'schedbtn', place: 'bottom-end', until: 'scheduleOpen', title: 'Start from the client', body: 'A tour groups the homes you’ll see in person with a client.', hint: 'Choose Schedule tour to continue' },
      { target: 'pickhomes', place: 'left', until: 'homesPicked', manual: true, title: 'Pick homes', body: 'Alex’s saved homes are listed here. Choose one or more.' },
      { target: 'pickslot', place: 'left', until: 'slotPicked', title: 'Pick a time', body: 'Choose a time that works. You can change it later.', hint: 'Choose a time to continue' },
      { target: 'bookbtn', place: 'right', until: 'tourBooked', title: 'Book it', body: 'A real client would get a confirmation. Alex is a sample, so no one will.', hint: 'Choose Schedule tour to continue' },
      { target: 'tourslist', place: 'bottom', title: 'Your tours', body: 'Upcoming tours live here. Add one to your calendar, or draft a text to confirm the details.' },
    ],
  },
  {
    id: 'assist', title: 'Ask RealAssist™ AI', mins: '1 min', stops: [
      { target: 'askra', place: 'bottom-end', until: 'assistOpen', title: 'Meet RealAssist™ AI', body: 'Your assistant reads client activity and suggests what to do next.', hint: 'Choose Ask RealAssist™ AI to continue' },
      { target: 'assistactions', place: 'left', until: 'assistAsked', title: 'Try an action', body: 'Catch Up is a good first one. It sums up what happened since you last checked.', hint: 'Choose an action to continue' },
      { target: 'assistreply', place: 'left', title: 'Your briefing', body: 'Act on a suggestion or ask a follow-up. Check important details before you act.' },
    ],
  },
  {
    id: 'clients', title: 'Invite your clients', mins: '1 min', stops: [
      { target: 'addclient', place: 'right', until: 'addOpen', title: 'Invite your clients', body: 'Clients join you on Realtor.com+ by invite. Invite one client, share your link, or bring in your whole list.', hint: 'Choose the Invite client icon to continue' },
      { target: 'addbody', place: 'left', title: 'Ways to invite', body: 'Invite one client with their contact info, or share your public link if you don’t have it. You can also upload a spreadsheet or connect your CRM.' },
      { target: 'inviteform', place: 'left', until: 'invited', title: 'Send your first invite', body: 'Enter their first name, last name, and email. Add a phone number and they’ll get a text too.', hint: 'Choose Invite to continue' },
      { target: 'invitedtab', place: 'right', enter: { clientTab: 'Invited' }, title: 'Waiting to sign up', body: 'Invited clients show up here until they accept and create a free realtor.com account.' },
    ],
  },
]

export const TOUR_BY_ID = Object.fromEntries(TOURS.map(t => [t.id, t])) as Record<TourId, Tour>
