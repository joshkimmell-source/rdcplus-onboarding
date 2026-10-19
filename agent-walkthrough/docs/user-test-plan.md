# User test plan: Realtor.com+ Getting started walkthroughs

Method: unmoderated, think-aloud prototype test on UserTesting. Walkthrough-led: participants start each Getting started tour and follow it. Desktop and mobile, same tasks.

Prototype: `https://rdcplus-test.github.io/agent-walkthrough/`
Tracking: see `tracking/README.md`. Every step of every tour is logged to a Google Sheet.

## 1. Goals and questions

We are testing the five in-product tours, not the workspace itself.

1. **Clarity.** Do people understand what each step is asking them to do?
2. **Completion.** Do they reach **Done** on each tour, and how long does it take?
3. **Friction.** Which steps cause hesitation, going back, asking to be shown (Show me), clicking the dimmed page, or giving up?
4. **Confidence.** After a tour, could they do the thing again on their own?
5. **Discovery.** Do they understand the welcome dialog choices, and do they find the Getting started list again after minimizing or dismissing it?

## 2. Participants

- **Who:** working real estate agents or team leads in the US. At least some who use a CRM or a similar tool today. No one who has seen Realtor.com+ before.
- **How many:** 5 to 8 per device. Run **desktop** and **mobile** as two tests with the same tasks.
- **Devices:** desktop test on a laptop or desktop browser (wider than 1,100 px). Mobile test on a phone (the prototype switches to its phone layout under 768 px wide).
- **Length:** about 30 minutes.

### Screener suggestions
- Currently works as a real estate agent, broker, or team lead.
- Works with buyers or sellers at least a few times a month.
- Uses a computer (desktop test) or a smartphone (mobile test) for client work.

## 3. Setup checklist (before launching)

1. Build and publish the prototype with tracking turned on (`tracking/README.md`, steps 1 and 2, then `npm run deploy:test`).
2. Open the published URL yourself and confirm `session_start` appears on the Sheet's `Events` tab.
3. **Check the Completion URLs in a UserTesting preview** (below). They work by changing the URL hash on the same page, and UserTesting may not treat that as arriving at the URL. If a task does not complete, tell me and we switch to real completion pages.
4. Add the prototype password to the intro task (it is the password in the app's password screen; it is not written in this file).
5. Use these Start URLs so sessions are labeled by test: desktop `https://rdcplus-test.github.io/agent-walkthrough/?pid=ut-desktop`, mobile `https://rdcplus-test.github.io/agent-walkthrough/?pid=ut-mobile`.

## 4. Completion URLs

Same page, URL hash changes when the tour's last step is finished (**Done**). Paste each into its activity in UserTesting.

The test copy is published by `npm run deploy:test` to `https://rdcplus-test.github.io/agent-walkthrough/` only (nothing is served at the site root). Always include the trailing slash: GitHub redirects `…/agent-walkthrough` to `…/agent-walkthrough/`, and the page URL a participant ends on has the slash, so the Completion URL should match it exactly.

| Activity | Completion URL |
|---|---|
| 2. Tour your workspace | `https://rdcplus-test.github.io/agent-walkthrough/#done-workspace` |
| 3. Explore your sample client | `https://rdcplus-test.github.io/agent-walkthrough/#done-sample` |
| 4. Schedule a tour | `https://rdcplus-test.github.io/agent-walkthrough/#done-schedule` |
| 5. Ask RealAssist™ AI | `https://rdcplus-test.github.io/agent-walkthrough/#done-assist` |
| 6. Invite your clients | `https://rdcplus-test.github.io/agent-walkthrough/#done-clients` |

If a participant ends a tour early (✕ or Esc) the URL becomes `#exit-<tour>` and the activity will not auto-complete. They can restart the tour from Getting started, or tell us they are done.

## 5. Session flow

| # | Activity | Approx. time |
|---|---|---|
| 1 | Intro and first impression of the welcome dialog | 4 min |
| 2 | Tour your workspace | 3 min |
| 3 | Explore your sample client | 4 min |
| 4 | Schedule a tour | 7 min |
| 5 | Ask RealAssist™ AI | 4 min |
| 6 | Invite your clients | 3 min |
| 7 | Wrap-up questions | 5 min |

Tours build on each other, so keep the order. If you want to counterbalance, run a second copy of each test with activities 5 and 6 swapped.

Each activity ends with the same two follow-ups, then its own probes.

**Standard follow-ups (after every activity)**
- *Rating, 1 to 7:* "Overall, how easy or difficult was this task?" (1 = very difficult, 7 = very easy)
- *Written:* "What, if anything, was confusing or unclear?"

---

## 6. Activities

### Activity 1: Intro and first impression (no completion URL)

**Intro to read aloud:** "Imagine you are a real estate agent who has just signed up for Realtor.com+, a tool for working with your clients. You signed in with your MLS, so your profile is already set up. Please think out loud as you go. We are testing the product, not you."

**Task:** "Go to the prototype link and enter the password. When a dialog appears, *do not click anything yet*. Tell us what you think this is and what you expect each button to do. Then choose the option you would normally choose."

**Watch for**
- Which option they pick (`welcome_choice` in the Sheet: *tour* or *explore*) and whether they hesitate.
- Do they notice **From your MLS** and understand nothing needs filling in?
- Do they understand **Alex Rivera** is a sample client and nothing reaches a real person?

**Follow-ups**
- *Written:* "In your own words, what do 'Show me around' and 'Explore on my own' do?"
- *Written:* "Which did you choose and why?"
- *Multiple choice:* "What is Alex Rivera?" (a real client of mine / a sample client for practice / one of my teammates / not sure)

---

### Activity 2: Tour your workspace
Completion URL: `…#done-workspace`

**Task:** "Open the **Getting started** list (a small panel at the bottom of the screen) and start **Tour your workspace**. Follow the steps until you reach **Done**."
*(Participants who chose "Show me around" in Activity 1 are already in it. They should keep going until Done.)*

**Watch for**
- Step 1 (`workspace:1:rail`): do they understand the left rail (desktop) or bottom bar (mobile)? On phones, do they notice the bar names "Support on the right"?
- Step 3 (`workspace:3:…`): is the large highlighted area understood as "everything about a client"?
- Step 4: do they click the highlighted Ask RealAssist™ AI button instead of Next, and what happens?

**Probes**
- *Written:* "What do you expect to find in Clients, Search, and Tours?"
- *Multiple choice:* "Where would you go to ask the AI assistant for help?" (rail/bar / top right of the page / Chat / not sure)

---

### Activity 3: Explore your sample client
Completion URL: `…#done-sample`

**Task:** "From Getting started, start **Explore your sample client**. Follow the steps until you reach **Done**."

**Watch for**
- Step 3 (`activitytab`): does "See your clients' activity" make them want to open it? Do they understand the button toggles to View feed?
- Step 4 (`feedtitle`, an action step): do they find and click the client name? How long until the hint helps (`stuck` events)? Do they use **Show me**?
- Step 5 and 6: do they notice Chat opens full screen on a phone? On phones, are the quick replies reachable (card is pinned at the top)?
- Step 7: do they understand Alex's reply is canned?

**Probes**
- *Written:* "What would you do with the Client activity page?"
- *Written:* "Where can you find the contact details for a client's feed?"
- *Rating 1 to 7:* "How clear was it that Alex is a sample and nothing is really sent?"

---

### Activity 4: Schedule a tour
Completion URL: `…#done-schedule`

**Task:** "From Getting started, start **Schedule a tour**. Pick homes for a showing, create the tour, then follow the remaining steps until you reach **Done**."
This is the longest tour (13 steps). Note where energy drops.

**Watch for (desktop and mobile)**
- Step 1: do they understand they can select more than one home? Do they try Next before selecting (Next is disabled until a home is picked)?
- Steps 2 and 3: Add to tour, then New tour. Is "New tour" findable in the dialog?
- Steps 4 and 5: calendar date pick and Create tour.
- Step 6 onward: do they open the new tour; on a phone, tap the tour in the list (`tourrow`)? On desktop, the new tour is already open.
- Reorder step: can they **drag the Move handle**? On a phone, does dragging work with a finger, and does the page scroll instead?
- Show route and Optimize: do they understand the difference? Do they expect Optimize to also show the route?
- Add to calendar and Open in: do they find **Open in**, and do they expect it to leave the prototype?

**Probes**
- *Written:* "In your own words, what is the difference between Show route and Optimize?"
- *Written:* "How would you change the order of the stops?"
- *Multiple choice:* "What do you expect 'Open in' to do?" (open the route in a maps app / share with the client / export to my calendar / not sure)
- *Rating 1 to 7:* "How confident are you that you could schedule a tour on your own now?"

---

### Activity 5: Ask RealAssist™ AI
Completion URL: `…#done-assist`

**Task:** "From Getting started, start **Ask RealAssist™ AI**. Follow the steps until you reach **Done**."

**Watch for**
- Step 1: do they find Ask RealAssist™ AI (button top right on desktop, round button bottom right on phones)?
- Step 2: do they understand the four quick actions? Which do they pick? (Invite client, View priorities, Check Client Pulse, Optimize Search)
- Step 3: do they read the AI's reply, or skip it?
- Start a new conversation / Threads / Expand / Collapse / Close: do they understand how Threads relates to a new conversation? (Desktop only: do they understand Expand and Collapse?)
- On a phone, does the panel feel like a separate screen, and do they know how to close it?

**Probes**
- *Written:* "What would you ask RealAssist™ AI to do for you?"
- *Multiple choice:* "How would you get back to an earlier conversation?" (Threads / scroll up / new conversation / not sure)
- *Rating 1 to 7:* "How much would you trust the AI's suggestions before acting on them?"

---

### Activity 6: Invite your clients
Completion URL: `…#done-clients`

**Task:** "From Getting started, start **Invite your clients**. Follow the steps until you reach **Done**. You can use made-up client details, or click **Show me**."
Tell participants: if they type a real person's details, the prototype shows a notice that a real invitation would be sent. (Nothing is actually sent.)

**Watch for**
- Step 1: do they find the Invite client icon (in the Clients list header)?
- Step 3: do they fill the form themselves or use Show me? Do they read the text-consent line? Do they notice the notice for non-sample details?
- Step 4: do they understand why the invited client is "waiting"?

**Probes**
- *Written:* "What do you think happens to your client after you press Invite?"
- *Multiple choice:* "Why might a client not show up under Active right away?" (they have not accepted yet / I made a mistake / the system is slow / not sure)
- *Rating 1 to 7:* "How comfortable would you be inviting a real client this way?"

---

### Activity 7: Wrap-up (no completion URL)

**Written / rating**
- *Rating 1 to 7:* "How helpful were the Getting started tours overall?"
- *Rating 1 to 7:* "How well did the tours explain the product?"
- *Multiple choice:* "How was the length of the tours?" (too short / about right / too long)
- *Multiple choice:* "How was the pace?" (too fast / about right / too slow)
- *Written:* "Which tour was most useful? Which was least useful? Why?"
- *Written:* "Was there a moment you wanted to skip ahead or stop? What was happening?"
- *Written:* "If you closed the Getting started list, how would you bring it back?" (watch whether they find Support in the rail or bottom bar)
- *Written:* "What would you change about the tours?"

---

## 7. Metrics and success criteria

All from the Sheet (`Tours` and `Steps` tabs) unless noted. Targets are starting points; adjust after the first few sessions.

| Metric | Source | Target |
|---|---|---|
| Completion rate per tour (reached Done), by device | `Tours` | 80% or higher |
| Median time per tour | `Tours` | Within 50% of the estimate shown in the list (1 to 2 min) |
| Abandons per step | `Steps` (abandons here) | No step with more than 15% of viewers |
| Stuck on an action step (20 s with no action) | `Steps` (stuck) | Under 10% of views |
| Show me used on an action step | `Steps` (show me %) | Under 30%; higher means the hint or target is unclear |
| Back clicks | `Steps` (back %) | Under 20% |
| Clicks on the dimmed page | `Steps` (blocked clicks) | Investigate any step above 1 per view |
| `target_missing` events | `Events` | None (these are defects) |
| Ease rating after each activity (1 to 7) | UserTesting | Average 5.5 or higher |

**Friction score** on the `Steps` tab ranks steps by a weighted count of abandons, stuck, long dwell, Back, Show me, and blocked clicks, per view. Start with the top five on each device.

## 8. Analysis plan

1. After each batch, run **Walkthrough → Refresh summary** in the Sheet.
2. Compare desktop and mobile on `Tours` (completion %, median time) and `Steps` (friction score).
3. For each high-friction step, watch the UserTesting recordings of the sessions that hit it and write down the *why* (misread copy, hidden control, interaction not working).
4. Group findings per tour: fix now (a broken or missing target, a control that does not work with touch), copy change, or design change.
5. Report: completion by tour and device, the top friction steps with a clip each, answers to the five research questions, and the recommended changes.

## 9. Known limits of the prototype (tell participants if asked)

- Everything is sample data. Nothing is sent to anyone.
- The map is a placeholder, not a real map; "Open in" opens real map sites with sample addresses.
- Refreshing the page restarts the experience.
