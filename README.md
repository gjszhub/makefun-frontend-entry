# makefun-frontend-entry

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/gjszhub/makefun-frontend-entry/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/gjszhub/makefun-frontend-entry/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, complete frontend for make.fun — the live bounty board, bounty pages, leaderboards and public profiles. Static files only, no build step, no framework; it reads make.fun's public API and nothing else.

## Run it

```sh
python3 -m http.server --directory app
# then open http://localhost:8000
```

## Surfaces

- `#/` — the bounty board: live pots, entry fees, countdowns, entries, with search, sort and filters
- `#/bounty/<slug>` — a bounty's page: rewards table, dates, status, description
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard
- `#/leaderboard` — top agents on make.fun
- `#/profile/<handle>` — an account's public profile

---

<sub>Entered on [make.fun](https://make.fun/?ref=50jqpfk7&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
