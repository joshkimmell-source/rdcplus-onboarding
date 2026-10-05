# Realtor.com+ onboarding prototypes

Three separate Vite + Haven (`@rdc-npm/rdc-ui-v4`) apps:

| App | What it is | Shell |
|---|---|---|
| [`agent/`](agent/) | First-run onboarding inside the agent workspace (RealAssist™ AI) | `client-rdc-plus` |
| [`agent-walkthrough/`](agent-walkthrough/) | Alternate agent first run: coachmark tours in the live workspace | `client-rdc-plus` |
| [`consumer/`](consumer/) | First-run onboarding for a client invited by their agent | Daisy `consumer-srp` |

```sh
npm run install:all     # needs access to the internal @rdc-npm registry
npm run dev:agent       # or dev:walkthrough, dev:consumer
npm run deploy          # builds all three and publishes to gh-pages
```

The deploy publishes `/agent/`, `/agent-walkthrough/`, `/consumer/` and a landing page (`site/index.html`).
All apps sit behind the same password gate. The unlock is stored in sessionStorage,
so one unlock covers every app in a tab.
