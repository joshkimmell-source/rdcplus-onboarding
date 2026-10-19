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
// The right-docked panel. Chat is a floating window; Add to tour and Invite client
// are modals.
export type Sheet = 'assist' | null
export type Route = 'clients' | 'search' | 'tours'
export type DetailTab = 'homes' | 'activity'
export type ClientTab = 'Active' | 'Invited' | 'Requests'
export type TourTab = 'Upcoming' | 'Past' | 'All'

export type Condition =
  | 'feedMenuOpen' | 'chatOpen' | 'chatSent'
  | 'homesPicked' | 'addToTourOpen' | 'newTourStarted' | 'clientPicked' | 'datePicked' | 'tourBooked'
  | 'assistOpen' | 'assistAsked' | 'assistNewChat' | 'assistExpanded' | 'assistCollapsed' | 'addOpen' | 'invited'

export type Enter = Partial<{ sheet: Sheet; detailTab: DetailTab; clientTab: ClientTab; chatOpen: boolean; expanded: boolean; over: boolean }>

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
      { target: 'clienthead', place: 'left', title: 'Everything about a client', body: 'The client’s feed, saved searches, and activity all live in this area. Select homes to build a tour, or open Client activity at the top right.' },
      { target: 'askra', place: 'bottom-end', title: 'RealAssist™ AI', body: 'Ask for a daily catch-up, a tour plan, or a message draft. It docks on the right whenever you need it.' },
    ],
  },
  {
    id: 'sample', title: 'Explore your sample client', mins: '2 min', stops: [
      { target: 'feedtiles', place: 'bottom', enter: { detailTab: 'homes' }, title: 'Saves, tour requests, and searches', body: 'Saved & Tour requests counts the homes Alex saved and the tours Alex asked for. Saved Searches are the searches that send Alex new listings automatically.' },
      { target: 'thisweek', place: 'top', enter: { detailTab: 'homes' }, title: 'Alex’s feed', body: 'Each client has a feed: listings from their saved searches and homes you share, newest first. Homes Alex saves are marked Saved. Use the filters above to narrow it down.' },
      { target: 'activitytab', place: 'bottom-end', enter: { detailTab: 'homes' }, title: 'See your clients’ activity', body: 'See what a client has viewed and saved, and when they were last active.' },
      { target: 'feedtitle', place: 'bottom', until: 'feedMenuOpen', title: 'See who’s on this feed', body: 'Choose the Client name to see the contact information for your clients and start a chat.', hint: 'Choose Alex Rivera to continue' },
      { target: 'feedchat', place: 'right', until: 'chatOpen', title: 'Chat with Alex', body: 'Your conversation with each client lives in one thread. You can also open Chat from the left rail.', hint: 'Choose Chat to continue' },
      { target: 'chatwindow', place: 'left', until: 'chatSent', title: 'Try a quick reply', body: 'Pick a suggestion or type your own. Alex is a sample, so nothing is sent.', hint: 'Send a message to continue' },
      { target: 'chatthread', place: 'left', title: 'Alex replied', body: 'Replies land here and in Chat on the left rail, and you’ll get a notification.' },
    ],
  },
  {
    id: 'schedule', title: 'Schedule a tour', mins: '2 min', stops: [
      { target: 'thisweek', place: 'top', until: 'homesPicked', manual: true, enter: { detailTab: 'homes' }, title: 'Pick homes', body: 'A tour starts with homes, not a button. Use the checkbox on a property to select it. Choose as many of Alex’s saved homes as you like.', hint: 'Select a home to continue' },
      { target: 'addtotour', place: 'top', until: 'addToTourOpen', title: 'Add to tour', body: 'Selecting homes opens a bar with actions for all of them. Choose Add to tour.', hint: 'Choose Add to tour to continue' },
      { target: 'tourdialog', place: 'left', until: 'newTourStarted', title: 'Start a new tour', body: 'Add the homes to a tour you already have, or start a new one. If you don’t have a tour yet, choose New tour.', hint: 'Choose New tour to continue' },
      { target: 'pickdate', place: 'left', until: 'datePicked', title: 'Pick a date', body: 'Choose the day for the showing. You can change it later.', hint: 'Choose a date to continue' },
      { target: 'createbtn', place: 'right', until: 'tourBooked', title: 'Create the tour', body: 'A real client would get a confirmation. Alex is a sample, so no one will.', hint: 'Choose Create tour to continue' },
      { target: 'tourslist', place: 'right', title: 'Your tours', body: 'Your tours live here, sorted into Upcoming, Past, and All. The one you just made is selected, with its homes and a map on the right.' },
    ],
  },
  {
    id: 'assist', title: 'Ask RealAssist™ AI', mins: '1 min', stops: [
      { target: 'askra', place: 'bottom-end', until: 'assistOpen', title: 'Meet RealAssist™ AI', body: 'Your assistant for all your client needs.', hint: 'Choose Ask RealAssist™ AI to continue' },
      { target: 'assistpanel', place: 'left', until: 'assistAsked', title: 'Take action', body: 'Onboard clients, get a daily briefing based on your clients’ needs and activity, optimize saved searches based on client preferences, and much more.', hint: 'Choose an action to continue' },
      { target: 'assistreply', place: 'left', title: 'Keep every client on the same page', body: 'Act on a suggestion or ask a follow-up. Check important details before you act.' },
      { target: 'newchat', place: 'bottom-end', until: 'assistNewChat', hint: 'Choose New conversation to continue', enter: { expanded: false, over: false }, title: 'Start a new conversation', body: 'Begin a fresh chat for a different client or task. Your earlier conversations stay saved.' },
      { target: 'expandpanel', place: 'bottom-end', until: 'assistExpanded', hint: 'Choose Expand panel to continue', enter: { expanded: false, over: false }, title: 'Give it more room', body: 'Expand RealAssist™ AI to full screen next to your conversation history.' },
      { target: 'threads', place: 'right', enter: { expanded: true, over: true }, title: 'Pick up where you left off', body: 'Threads keeps every conversation, so you can return to a client’s briefing or start a new one from here.' },
      { target: 'expandpanel', place: 'bottom-end', until: 'assistCollapsed', hint: 'Choose Collapse panel to continue', enter: { expanded: true, over: true }, title: 'Collapse back to the dock', body: 'Collapse the panel to dock it beside your work again. Your conversation stays where you left it.' },
      { target: 'closepanel', place: 'bottom-end', enter: { expanded: false, over: false }, title: 'Close the panel', body: 'Close RealAssist™ AI when you’re done. Choose Ask RealAssist™ AI any time to bring it back.' },
    ],
  },
  {
    id: 'clients', title: 'Invite your clients', mins: '1 min', stops: [
      { target: 'addclient', place: 'right', until: 'addOpen', title: 'Invite your clients', body: 'Clients join you on Realtor.com+ by invite. Invite one client or share your link.', hint: 'Choose the Invite client icon to continue' },
      { target: 'addbody', place: 'left', title: 'Ways to invite', body: 'Invite one client with their contact info, or share your public link if you don’t have it.' },
      { target: 'inviteform', place: 'left', until: 'invited', title: 'Send your first invite', body: 'Enter their first name, last name, and email. Add a phone number and they’ll get a text too.', hint: 'Choose Invite to continue' },
      { target: 'clientlist', place: 'right', enter: { clientTab: 'Invited' }, title: 'Waiting to sign up', body: 'Invited clients show up here until they accept and create a free realtor.com account.' },
    ],
  },
]

export const TOUR_BY_ID = Object.fromEntries(TOURS.map(t => [t.id, t])) as Record<TourId, Tour>
