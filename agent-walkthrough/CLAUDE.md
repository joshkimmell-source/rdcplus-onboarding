# Realtor.com+ Agent Onboarding — In-product walkthrough

Alternate direction to `agent/`. Instead of a full-screen guided modal and a
checklist, the agent learns in the real workspace through coachmark tours.

**Surface:** Client RDC+ (RealAssist™ AI) agent workspace, desktop-first (≥1024px)
**Skill / shell:** `client-rdc-plus-experience`, built on the Daisy `client-rdc-plus` shell
**Start:** `npm run dev` → http://localhost:5173 (from this folder, or `npm run dev:walkthrough` at the root)
**Dev switches:** `?dim=0` (ring + halo, no scrim) and `?corner=left` (tour list bottom-left). Prototype-only; not product controls.

## Files

- `src/tours.ts`: the five tours (stops, targets, `enter` / `until` / `manual`, copy)
- `src/Coachmark.tsx`: spotlight, click blockers, and the popover (positioning, focus, Esc)
- `src/Onboarding.tsx`: welcome dialog and the floating tour list / pill
- `src/Shell.tsx`: the full `client-rdc-plus` shell (NavRail, Subnav, MainHeader + ActionBar, Clients screen with tiles / pills / `PropertyCard` feed, docked RealAssist™ AI panel with launcher, transcript, and threads) plus the tour state machine

## Shell extensions

Kept the shell's structure and primitives; added only what the tours point at:
- a client header on the Clients screen (Sample client tag, summary, Schedule tour) and a Client activity view that swaps in for the listing feed
- Client activity as the dark (Primary) action in the header's ActionBar, left of Ask RealAssist™ AI, as in the product
- an "+ Add" tile after the Saved Searches tile (goes to Search)
- a Feed Members popover on the header title (Haven `Popover`): "Chat with group" plus the feed's members
- Chat in a floating window at the bottom right (as in the product), opened from the rail's Chat cell or the Feed Members popover. Not a docked sheet
- Schedule a tour in a Haven `Modal`. While a tour runs over any modal, the coachmark portals into the modal's portal target (`ModalCoachmark`) and the stop is announced from a live region inside the dialog, because Radix hides the target from assistive tech and traps focus in the dialog
- Invite client in a Haven `Modal`, as in the product: client information (first / last name, email, phone recommended) with the text-consent line, Share public link (Copy link), and Bring in your list (spreadsheet, CRM; not functional). Sending closes the modal and shows the Invited tab. Tours run over it through `ModalCoachmark`
- the RealAssist™ AI panel is now the only right-docked panel
- a Tours Subnav list and Tours screen in place of the shell's stubs
- Support in the rail reopens the tour list; Chat opens the chat window
- the RealAssist™ AI panel starts closed (the shell opens it by default)
- ActionBar fold: re-measures on every reset and after web fonts load, so labels shed when a panel opens

## Product rules

- The agent signs in through their MLS. Profile, license, and service area are shown read-only ("From your MLS"). No forms during onboarding.
- Alex Rivera is a sample client, labeled everywhere. Nothing sent to Alex reaches a real person.
- Clients join by invite or the agent's public link, and need a free realtor.com account to connect. RealAssist™ can't import clients. Bulk upload and CRM connect are present but non-functional.
- The RealAssist™ AI sheet is closed by default and only opens from "Ask RealAssist™ AI" or a tour step that asks for it.
- Progress is kept in memory. `savePrefs` in `Shell.tsx` is the stub for the user-preferences call.

## Copy source

Tour copy and labels follow the support article "Agents: Getting started on Realtor.com+"
(support.realtor.com/s/article/rdcplus-gettingstarted) and its linked articles: the product
is **Realtor.com+**, the client tab is **Client activity**, messaging is **Chat**, and an invite
takes first name, last name, and email (mobile optional). The article doesn't cover RealAssist™ AI.
