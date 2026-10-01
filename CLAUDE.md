# Realtor.com+ onboarding prototypes

Two independent apps, each with its own package.json, Panda config and Vite build:

- `agent/`: the agent workspace first-run flow. See `agent/CLAUDE.md`. Keep as-is unless asked.
- `consumer/`: the consumer first-run flow. See `consumer/CLAUDE.md`.

Root `scripts/deploy.sh` (`npm run deploy`) builds both apps and force-pushes
`agent/dist`, `consumer/dist` and `site/index.html` to `gh-pages`. GitHub can't
install `@rdc-npm`, so builds must happen locally.
