# Walkthrough user-test tracking

The prototype logs what a participant does in the Getting started tours and posts it to a Google Sheet.
Nothing is sent unless the app is built with `VITE_TRACKING_URL`. Typed text (invite form, chat) is never recorded.

## 1. Create the Sheet and the endpoint (one time, about 10 minutes)

1. Create a Google Sheet in your RDC Google account (for example "Walkthrough user tests"). **Share it only with the people who should see results.** Opening it needs an RDC Google sign-in; that is the access control for the data.
2. In the Sheet: **Extensions → Apps Script**. Replace the contents with `tracking/Code.gs` from this repo.
3. In Apps Script **Project Settings → Script properties**, add `WRITE_TOKEN` with any long random string.
4. Run `setup` once from the editor (approve the permissions). It creates the `Events`, `Sessions`, `Tours` and `Steps` tabs.
5. **Deploy → New deployment → Web app.** Execute as: *Me*. Who has access: *Anyone*. (Participants are not RDC users, so the write endpoint has to accept anonymous posts. It is write-only and needs the token.) Copy the web app URL.

## 2. Point the prototype at it

Create `agent-walkthrough/.env.local` (git-ignored):

```
VITE_TRACKING_URL=https://script.google.com/macros/s/XXXX/exec
VITE_TRACKING_TOKEN=the same string as WRITE_TOKEN
```

Then build and publish the test copy (`npm run deploy:test` from the repo root; it publishes only the walkthrough, to `https://rdcplus-test.github.io/agent-walkthrough/`). The token ends up in the JavaScript bundle, like the existing prototype password. It keeps stray traffic out; it is not a secret.

To confirm it works, open the deployed prototype once and check that `session_start` appears on the `Events` tab within a few seconds.

Start URL options: `?pid=ut-07` labels a participant (shows in the `pid` column), `?notrack` turns tracking off for that visit.

## 3. Reading the results

In the Sheet use the **Walkthrough → Refresh summary** menu (or add a time trigger on `refreshSummary`).

| Tab | What it shows |
|---|---|
| `Tours` | Per tour and layout: sessions started, sessions completed, **completion %**, abandons, median time |
| `Steps` | Per step: views, median dwell, back %, show me %, blocked clicks, stuck, long dwell, abandons here, **friction score** (sorted worst first) |
| `Sessions` | One row per participant session, with their totals |
| `Events` | The raw log |

Completion means the participant pressed **Done** on the tour's last step. Ending a tour early (✕ or Esc) counts as an abandon and records the step they were on.

## Events

Every event has `t` (ISO time), `sid` (random per browser tab), `pid` (optional label), `seq`, `layout` (`desktop` or `mobile`), `vw`/`vh`.

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

The app changes the URL hash on the same page, with no reload:

| When | Hash |
|---|---|
| A tour starts | `#start-<tour>` |
| Done on the last step | `#done-<tour>` |
| Ended early | `#exit-<tour>` |

Tour ids: `workspace`, `sample`, `schedule`, `assist`, `clients`. The Completion URL for an activity is the prototype URL plus `#done-<tour>`; the full list is in `docs/user-test-plan.md`.

## Testing without a Sheet

```
bun tracking/mock-endpoint.ts                      # prints events, GET /events returns them
VITE_TRACKING_URL=http://localhost:8787 VITE_TRACKING_TOKEN=test npx vite --port 5201
```
