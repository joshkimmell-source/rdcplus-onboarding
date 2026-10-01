# RDC+ Agent Onboarding — First-Run Flow

Prototype project for a first-run onboarding flow inside the RDC+ (RealAssist™ AI) agent workspace.

**Surface:** Client RDC+ (RealAssist™ AI) — desktop-first agent workspace, responsive down to 390px
**Shell:** `client-rdc-plus` (provisioned into this folder)
**Main file:** `src/Shell.tsx`
**Start:** `npm install && npm run dev` → http://localhost:5173 (use a viewport of ~1024px or wider)
**Fidelity:** Exploratory (quick exploration)

---

## Project context

A newly signed-up **individual agent** opens RDC+ for the first time. They already have an account, so this is not signup. It is the first-run experience inside the workspace. The flow gets them set up and to their first moment of value in four steps:

1. **Profile setup:** confirm name, photo, brokerage, market/service area, and contact details
2. **Import clients:** bring an existing client roster into RDC+ (CSV upload, CRM connect, or add a client manually)
3. **RealAssist™ tour:** a short guided introduction to the RealAssist™ AI panel and its capabilities (Add Client, Catch Up, Client Pulse, Search Optimization, Coordinate Tour)
4. **Set up a tour:** schedule the agent's first property showing for one of their imported clients, ending in the Tours area of the workspace

**Interaction model (hybrid):** the step-by-step flow runs in the **main content area** with a progress indicator, Back/Continue, and skip where it makes sense. The **RealAssist™ AI panel stays docked alongside** and offers help that fits the current step. For example, it can offer to fill in the profile, map CSV columns, or suggest a client and time slot for the first tour. The panel supports the flow; it does not replace it. Every step has to be completable without using the assistant.

**Build type:** Multi-screen flow
**Audience:** A new individual agent (a solo buyer's or listing agent, not a team lead or broker)
**Constraints:** None specified

---

## Skills to load

- `design-system`: Haven (`@rdc-npm/rdc-ui-v4`) component library reference
- `design-tokens`: Panda semantic tokens (spacing, color, radius, type)
- `client-experience`: base client-side rules: professional agent tone and data density
- `client-rdc-plus-experience`: RDC+ workspace chrome (NavRail, Subnav, docked RealAssist™ panel), brand gradient rules, client and tour card patterns
- `prototyping-patterns`: multi-screen flow structure, step state, navigation between screens
- `interaction-patterns`: stepper/progress, skip/back behavior, guided-tour highlighting of the assistant panel
- `forms-and-validation`: profile setup form and add-client form
- `copy-and-content`: onboarding copy, step titles, and assistant suggestions in professional agent language

**Optional**
- `data`: add if the client-import step needs a realistic roster or a CSV column-mapping preview
- `accessibility`: add before any design review or user testing (focus order through steps, spotlight/tour focus trapping)
- `user-testing-simulator` with personas such as `persona-sam-buyer-agent`: add if you later want a simulated first-run walkthrough

---

## Shell and chrome rules

- Keep the **NavRail**, **MainHeader**, and **RealAssist™ AI panel** in place. Build the onboarding steps inside the main content area.
- During onboarding the **Subnav** may be hidden or show an empty or near-empty client roster. After the import step it should fill in with the imported clients. After the "Set up a tour" step, the **Tours** Subnav should show the new tour.
- The **brand gradient** (`BRAND_GRADIENT`) stays confined to the FAB, the panel-header chip, and the header "Ask RealAssist™ AI" button. Do not use it on onboarding CTAs or progress indicators.
- Use **RealAssist™ AI** with the ™ on first and prominent use.
- Use professional agent terms: "Client" (not "Lead"), "Stage", "Saved homes", "Draft a text".
- Useful shell hooks in `src/Shell.tsx`: `AGENT` (sample agent: Georgia Booth, Brightwater Realty Group), `CLIENTS`, `ASSIST_ACTIONS`, `SEED_MSGS`, `NAV_ITEMS`, and the `ClientsScreen` / `ScreenPlaceholder` screens. The assistant responder is canned; seed step-specific turns per onboarding step.
- The shell's Tours screen is an intentional stub. Replace it with a simple tour list or a tour card for the final step.

---

## Fidelity expectation — Exploratory

- Priority is structure and flow: all four steps reachable end to end, with working Back/Continue/Skip and step state.
- Real Haven components and tokens, but rough copy is fine and layouts can be simple.
- Do not spend time on edge cases, loading and error states, or pixel polish.
- The assistant panel only needs one canned, step-aware suggestion per step to demonstrate the hybrid model.
- Disposable: optimize for comparing directions quickly, not for handoff.

---

## Open questions

- **"Set up a tour" meaning:** interpreted as scheduling the agent's first property showing with a client, tied to the Tours area and the "Coordinate Tour" RealAssist™ action. It could instead mean a product walkthrough of the workspace, which would overlap with the RealAssist™ tour step. Confirm before going further.
- **Step order and skipping:** can the agent skip Import clients? If so, what does "Set up a tour" use as its client (a sample client, or add one inline)?
- **Import sources:** which import options to show: CSV, CRM connection (for example Follow Up Boss), manual add, or all of these?
- **Profile fields:** which fields are required vs. optional (license number, MLS ID, service area, headshot)?
- **Assistant default state:** is the RealAssist™ panel open by default during onboarding, or opened from a prompt in each step?
- **Completion and re-entry:** where does the agent land when finished (Clients screen with a success state?), and can they resume a partly completed onboarding later (a persistent checklist)?

---

## Session notes

- No PRD was provided. Scope comes from the kickoff interview.
- The shipped RDC+ runs on Zenlist's reskinned UI, not Haven. This prototype is a forward-looking exploration on Haven. Do not copy Zenlist's legacy markup.
- The RealAssist™ launcher already has an "Add Client" action described as "guide agent through client onboarding". Reuse it as the assistant-side entry for the Import clients step.
- Library gap: there is no dedicated onboarding, stepper, or guided-tour (coach marks / spotlight) skill. Build the stepper and the RealAssist™ tour highlight using `interaction-patterns` and `prototyping-patterns`.
- Next step: run `prototype-builder` to build the flow into `src/Shell.tsx`.
