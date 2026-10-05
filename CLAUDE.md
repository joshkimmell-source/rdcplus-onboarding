# Realtor.com+ onboarding prototypes

Three independent apps, each with its own package.json, Panda config and Vite build:

- `agent/`: the agent workspace first-run flow. See `agent/CLAUDE.md`. Keep as-is unless asked.
- `agent-walkthrough/`: alternate agent first run, coachmark tours in the live workspace. See `agent-walkthrough/CLAUDE.md`.
- `consumer/`: the consumer first-run flow. See `consumer/CLAUDE.md`.

Root `scripts/deploy.sh` (`npm run deploy`) builds all three apps and force-pushes
`agent/dist`, `agent-walkthrough/dist`, `consumer/dist` and `site/index.html` to `gh-pages`. GitHub can't
install `@rdc-npm`, so builds must happen locally.
