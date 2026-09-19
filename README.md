# Pick Predict

Pick Predict is a live esports draft prediction game for League of Legends co-streams and watch parties. A producer runs the professional pick/ban sequence while viewers predict each lock-in and compete on game and series leaderboards.

## Run locally

Requires Node.js 20 or newer. There are no runtime dependencies.

```bash
npm start
```

Then open:

- Viewer experience: <http://localhost:4173>
- Producer dashboard: <http://localhost:4173/control>

Open the viewer page in multiple browsers or private windows to simulate independent viewers.

## Test

```bash
npm test
```

## Included in Milestone 1

- Full 20-action professional pick/ban sequence
- Match, team, best-of, game, and series setup
- Server-authoritative voting deadlines
- Editable predictions until voting closes
- Pick and ban scoring, rarity bonuses, and streak bonuses
- Game and series leaderboards
- Producer controls for resolving, cancelling, undoing, and resetting actions
- Live multi-browser synchronization using server-sent events with polling fallback
- Responsive viewer and producer interfaces

## Prototype deployment note

The current state store is in memory, intentionally keeping the first milestone dependency-free. It is suitable for local testing and a single long-running Node process. A production serverless deployment needs a shared store such as Postgres or Redis so match state survives cold starts and is consistent across instances.
