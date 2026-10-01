# RealAssist AI / RDC+ Shell

Prototype environment for **RDC+ (RealAssist™ AI)** — realtor.com's agent-facing "AI content orchestration" workspace (the Zenlist-derived agent app, reimagined on Haven). A three-column workspace: a 64px **NavRail**, an optional 320px **Subnav**, the main screen, and a docked **RealAssist™ AI** assistant panel on the right — all from `@rdc-npm/rdc-ui-v4`.

> **Note on the real product.** The shipped RDC+ app is Zenlist's UI with an RDC visual reskin — it does **not** currently run on Haven. This shell is a *forward-looking* Daisy scaffold built on Haven (matching the design team's reference exploration and the stated direction toward a unified RDC component library). Prototype here as if RDC+ were on the design system.

## What's in the shell

- **NavRail** (64px) — the collapsed realtor.com PRO logo at the top; Clients / Search / Tours nav cells; inert Support / Alerts / Chat secondary cells; an account avatar (initials) pinned to the bottom
- **Subnav** (320px) — a contextual list panel that appears for Clients (a filterable roster with Active / Invited / Requests tabs, search, and rows carrying an online-status dot) and Tours; hidden for Search. Collapsible via the header toggle
- **Main header** — page title, an overflow (⋯) menu, and a **responsive Secondary-button cluster** (Agent notifications, Hotsheets, Market data, Favorites) that shows labels when there's room and folds to icon-only circles as the header narrows. The brand **Ask RealAssist™ AI** pill sits at the right and is the sole assistant entry point when the panel is closed
- **Clients screen** (built out) — "Saved & Tour requests" count tiles + a "Saved Searches" tile; a filter-pill row with sort and a grid / map / table view toggle; and a "Today" listing feed of Haven `PropertyCard`s (kept deliberately lean — see Scope & line budget)
- **RealAssist™ AI panel** — a docked, expandable assistant: a launcher (composer + capability `Card`s) that gives way to a transcript, plus a conversation-history **Threads** view that renders as an inline dock when the panel is expanded and a sliding overlay when it's docked-narrow. A lightweight stand-in — wire your own responder

Search and Tours are intentional stubs (the real surfaces are full-bleed Leaflet maps) — swap them for your prototype's content.

## Start prototyping

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. It's desktop-first — use a wide viewport (~1024px+) to see the full three-column layout; the header actions and panel collapse responsively as you narrow it.

> The `dev`/`build` scripts run `panda codegen && panda cssgen --outfile src/panda.css` before Vite. If the shell ever renders unstyled, the server was started before a config change — restart it so `src/panda.css` regenerates.

## How to add your prototype content

Edit `src/Shell.tsx`. The shell is organized into clear sections:

1. **Sample data** — the `AGENT`, `CLIENTS`, `CLIENT_FEED`, `LISTINGS`, `ASSIST_ACTIONS`, `THREADS`, and `SEED_MSGS` consts at the top; replace with your scenario's content
2. **`ClientsScreen`** — the built-out landing screen (count tiles, filter pills, view toggle, and the `LISTINGS` `PropertyCard` feed); extend with more client-workspace sections (pipeline, saved-home charts)
3. **`AssistantPanel`** (with `AssistantLauncher` and `ThreadsList`) — the RealAssist™ launcher, transcript, composer, and threads history; wire a real responder into `send()`
4. **Navigation model** — the `NAV_ITEMS` / `SECONDARY_NAV` arrays and `Shell`'s `active` state; add destinations and screens as needed

Keep the NavRail, MainHeader, and the RealAssist™ panel in place. Build inside the main content area.

## Stack

- React 18 + TypeScript
- **Panda CSS** for tokens and layout — `css()`, `cva()` from `styled-system/css`; `hstack()`, `vstack()` from `styled-system/patterns`
- `@rdc-npm/rdc-ui-v4` — `Button`, `Card`, `Checkbox`, `Link`, `PropertyCard`, `Tag`, and icons/logos from `@rdc-npm/rdc-ui-v4/illustrations`. Avatars use a small custom `Initials` primitive (the roster's online-status dot has no Haven equivalent), not Haven `Avatar`

No `RdcUiThemeProvider` needed — tokens are generated at build time. Do NOT use `styled-components`, `rdcUiTheme`, or Tailwind color utilities; custom styling uses Panda semantic tokens (`bg.base`, `text.base`, `border.base`, etc.).

## Scope & line budget

`shells/README.md` flags shells approaching ~900 lines as "too detailed — trim." `src/Shell.tsx` sits above that band **by design**. This is the only shell that carries **four** major regions at once — the 64px NavRail, the 320px Subnav, the built-out main screen, **and** the full RealAssist™ AI workspace (composer, transcript, and the threads dock/overlay). The assistant workspace is the shell's whole reason to exist, so it stays complete.

If the file ever needs to shrink, **the listing grid goes first** — it re-demonstrates the client listing dashboard (which is `client-rpd`'s job), not this surface's AI-orchestration purpose. It's already kept lean: two representative `PropertyCard`s plus an extend comment, rather than the full feed.

## Surface rules

- **Responsive**: desktop-first, responsive down to a 390px phone viewport — below `md` the NavRail can drop to a bottom bar and the Subnav / assistant panel become overlays; there is no separate mobile shell
- **RealAssist™ brand gradient**: the magenta→coral→red gradient is the one intentional non-token value, confined to the **Ask RealAssist™ AI** pill (the assistant's entry point when the panel is closed). Everything else uses semantic Panda tokens
- **Color**: semantic Panda tokens only — no hardcoded hex (the brand gradient excepted), no Tailwind color classes
- **Trademark**: it's **RealAssist™ AI** — keep the ™ on first/prominent use
