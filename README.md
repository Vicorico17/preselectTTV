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

## Included

- Full 20-action professional pick/ban sequence
- Match, team, best-of, game, and series setup
- Server-authoritative voting deadlines
- Editable predictions until voting closes
- Pick and ban scoring, rarity bonuses, and streak bonuses
- Game and series leaderboards
- Producer controls for resolving, cancelling, undoing, and resetting actions
- Live multi-browser synchronization using server-sent events with polling fallback
- Responsive viewer and producer interfaces

### Milestone 2

- Twitch OAuth authorization-code flow for producer identity
- Broadcaster and moderator allowlists
- OBS browser-source overlay at `/overlay`
- Broadcast-delay calibration that withholds results **and score changes**
- Local automatic state recovery plus recovery snapshot export/import
- Standard, rapid, analyst-desk, and international match templates
- Live vote distribution for the co-stream overlay

## Twitch OAuth configuration

Create a Twitch application and register this callback URL:

```text
https://YOUR_DOMAIN/api/auth/callback
```

Configure these environment variables:

```text
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/callback
SESSION_SECRET=a-long-random-secret
TWITCH_BROADCASTER_IDS=123456
TWITCH_MODERATOR_IDS=234567,345678
```

When Twitch variables are absent, the producer desk runs in clearly labelled demo mode for local development.

## Prototype deployment note

Local Node deployments automatically recover state from `.data/pick-predict.json`. Vercel currently uses warm-instance memory plus manual recovery snapshots; production serverless operation still needs a shared store such as Postgres or Redis for consistency across cold starts and instances.
