# Walkthrough user-test tracking

The prototype logs what a participant does in the Getting started tours and sends it to a Google Sheet through a Google Form.
Nothing is sent unless the app is built with the Form settings below. Typed text (invite form, chat) is never recorded. The one exception is the first name typed on the opening screen, which is sent as `firstName` on every event so results can be matched to a participant; the opening screen tells participants this.

## 1. Create the Form and Sheet (one time, about 15 minutes)

Participants are not News Corp users and Apps Script web apps can only be opened to News Corp accounts, so events are submitted to a **Google Form** that accepts responses without sign-in. A script on the Form's response Sheet unpacks them.

1. **Create a Google Form** in your RDC Google account, titled for example "Walkthrough tracking (do not fill in)". Add **one question**: type *Paragraph* (long answer), title `payload`, not required.
2. **Form settings → Responses**: turn **off** "Restrict to users in News Corp…", "Limit to 1 response", and "Collect email addresses". Leave "Allow response editing" off.
3. **Check it works for outsiders**: copy the Form's *send* link and open it in a private window where you are not signed in to Google. If it asks you to sign in, News Corp's admin has restricted this too; tell me and we use another collector.
4. **Find the two values the app needs:**
   - **Form response address:** from the Form's link `https://docs.google.com/forms/d/e/<FORM_ID>/viewform`, the response address is `https://docs.google.com/forms/d/e/<FORM_ID>/formResponse`.
   - **Field id:** in the Form, ⋮ → **Get pre-filled link**, type `x` into `payload`, **Get link**, and read the `entry.123456789=x` part of the link. `entry.123456789` is the field id.
5. **Link a Sheet:** in the Form, **Responses → Link to Sheets → Create a new spreadsheet**. **Share that Sheet only with the people who should see results**; opening it needs an RDC Google sign-in.
6. In that Sheet: **Extensions → Apps Script**. Replace the contents with `tracking/Code.gs` from this repo.
7. In Apps Script **Project Settings → Script properties**, add `WRITE_TOKEN` with any long random string.
8. Run **`setup`** once from the editor and approve the permissions. It creates the `Events`, `Sessions`, `Tours` and `Steps` tabs and installs the trigger that fills `Events` on every submission. (Do not deploy it as a web app; it isn't one.)

## 2. Point the prototype at it

Create `agent-walkthrough/.env.local` (the leading dot matters; the file is git-ignored):

```
VITE_TRACKING_FORM_URL=https://docs.google.com/forms/d/e/<FORM_ID>/formResponse
VITE_TRACKING_FORM_ENTRY=entry.123456789
VITE_TRACKING_TOKEN=the same string as WRITE_TOKEN
```

Then build and publish the test copy (`npm run deploy:test` from the repo root; it publishes only the walkthrough, to `https://rdcplus-test.github.io/agent-walkthrough/`). The Form address and token end up in the JavaScript bundle, like the existing prototype password. The token keeps stray traffic out of `Events`; it is not a secret. Anyone who finds the Form address could still add rows to the Form's own responses tab, which the script ignores unless the token matches.

To confirm it works, open the deployed prototype once and check that a row appears on the Form's responses tab and, a moment later, `session_start` on the `Events` tab.

Start URL options: `?pid=ut-07` labels a participant (shows in the `pid` column), `?notrack` turns tracking off for that visit.

## 3. Reading the results

In the Sheet use the **Walkthrough → Refresh summary** menu (or add a time trigger on `refreshSummary`).

| Tab | What it shows |
|---|---|
| `Tours` | Per tour and layout: sessions started, sessions completed, **completion %**, abandons, median time |
| `Steps` | Per step: views, median dwell, back %, show me %, blocked clicks, stuck, long dwell, abandons here, **friction score** (sorted worst first) |
| `Sessions` | One row per participant session, with their first name and totals |
| `Events` | The raw log |

Completion means the participant pressed **Done** on the tour's last step. Ending a tour early (✕ or Esc) counts as an abandon and records the step they were on.

## Events

Every event has `t` (ISO time), `sid` (random per browser tab), `pid` (optional label), `firstName` (typed on the opening screen; empty until entered), `seq`, `layout` (`desktop` or `mobile`), `vw`/`vh`.

| Event | When | Extra fields |
|---|---|---|
| `session_start` | The prototype unlocks | |
| `welcome_choice` | Welcome dialog dismissed | `choice`: `tour` or `explore` |
| `list_expand` / `list_minimize` / `list_dismiss` / `list_open_support` | Getting started list | |
| `tour_start` | A tour begins | `tour`, `steps`, `source` (`list` or `welcome`) |
| `step_view` | A step appears | `tour`, `step`, `steps`, `stepId`, `title`, `how` (`start`/`next`/`back`/`auto`/`show_me`), `action` |
| `step_exit` | A step is left | same, plus `reason` (`next`/`back`/`auto`/`show_me`/`complete`/`end`), `dwellMs`, `blocked`, `hint`, `showMe` |
| `show_me` | Show me clicked | step fields |
| `tour_complete` | Done pressed | `totalMs`, `stepsViewed`, `back`, `showMeClicks`, `blocked`, `stuck`, `longDwell` |
| `tour_abandon` | Ended early | step fields + the same totals |
| `stuck` | 20 s on an action step with no action | step fields |
| `long_dwell` | 45 s on an info step | step fields |
| `target_missing` | The highlighted element never appeared | step fields (a defect, not the participant) |

`stepId` is `tour:number:target`, for example `schedule:7:tourrow`. Step numbers differ between desktop and mobile (some steps exist on one only), so the `Steps` tab keeps the layouts apart.

## Completion URLs (UserTesting)

UserTesting's *Validation by URL* could not see an in-page `#hash` change, so **Done** now loads a real page: `https://rdcplus-test.github.io/agent-walkthrough/?done=<tour>`. The session is kept in the browser tab, so the participant lands back in the prototype with their progress.

| When | URL |
|---|---|
| A tour starts | `?start=<tour>` (rewritten in place, no reload) |
| Done on the last step | `?done=<tour>` (page load) |
| Ended early | `?exit=<tour>` (rewritten in place) |

Tour ids: `workspace`, `sample`, `schedule`, `assist`, `clients`. `?pid=` and `?notrack` from the Start URL are kept for the tab, so events keep their label. The `page_load` event marks each later load of the page. The UserTesting operator and Starting URL settings are in `docs/user-test-plan.md`, section 4.

## Testing without a Sheet

```
bun tracking/mock-endpoint.ts                      # prints events, GET /events returns them
VITE_TRACKING_FORM_URL=http://localhost:8787/formResponse VITE_TRACKING_FORM_ENTRY=entry.1 VITE_TRACKING_TOKEN=test npx vite --port 5201
```
