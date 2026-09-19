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

### Milestone 3

- Twitch video-overlay, panel, and broadcaster configuration entry points
- Verified Twitch Extension JWTs using the base64 Extension secret
- Persistent `U-` opaque Twitch viewer identities and temporary anonymous identities
- Channel-isolated drafts, predictions, and leaderboards
- Mobile panel layout within Twitch's 318×496 panel dimensions
- Identity-sharing prompt for anonymous viewers
- CSP-compatible, dependency-free Twitch CDN asset bundle
- Hosted-test packaging command and reviewer walkthrough
- Public Terms and Privacy pages

### Milestone 4

- Local browser-window capture using the Screen Capture API
- Calibrated champion portrait crop with reusable browser calibration
- Data Dragon 16.18.1 champion portrait recognition
- Stable multi-frame proposals with configurable confidence threshold
- Mandatory moderator confirmation before resolving predictions
- Experimental on-device broadcast OCR when `TextDetector` is available
- Optional licensed esports-data adapter for automatic live match metadata
- Automation audit log and provider status

Open `/automation` from the producer dashboard. Broadcast frames are processed locally and are not uploaded.

To connect a licensed match-data feed, configure an endpoint returning a JSON `matches` array:

```text
ESPORTS_DATA_URL=https://provider.example/live-matches
ESPORTS_DATA_TOKEN=optional-bearer-token
```

Build the uploadable Twitch asset package with:

```bash
npm run extension:package
```

See [`docs/twitch-extension-review.md`](docs/twitch-extension-review.md) for console settings and the reviewer walkthrough.

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
TWITCH_EXTENSION_SECRET=base64-extension-secret
```

When Twitch variables are absent, the producer desk runs in clearly labelled demo mode for local development.

## Prototype deployment note

Local Node deployments automatically recover state from `.data/pick-predict.json`. Vercel currently uses warm-instance memory plus manual recovery snapshots; production serverless operation still needs a shared store such as Postgres or Redis for consistency across cold starts and instances.
