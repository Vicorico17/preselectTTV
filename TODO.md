# Pick Predict production checklist

## Critical infrastructure

- [ ] Add PostgreSQL for channels, series, games, viewers, predictions, scores, and audit history.
- [ ] Add Redis for live rounds, countdowns, realtime fan-out, and distributed locks.
- [ ] Replace Vercel warm-instance memory with the shared state layer.
- [ ] Add database migrations, backups, restore testing, and retention rules.
- [ ] Add idempotency around prediction resolution and score awards.

## Twitch application and Extension

- [ ] Create the Twitch developer application.
- [ ] Create the Twitch Extension version.
- [ ] Register the production OAuth callback URL.
- [ ] Configure `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`.
- [ ] Configure `TWITCH_EXTENSION_SECRET` from the Extension Manager.
- [ ] Configure `TWITCH_BROADCASTER_IDS` and `TWITCH_MODERATOR_IDS`.
- [ ] Generate and configure a strong `SESSION_SECRET`.
- [ ] Add the production backend hostname to the Extension URL-fetching allowlist.
- [ ] Upload `dist/pick-predict-twitch-extension.zip` to Twitch.
- [ ] Configure `panel.html`, `video.html`, and `config.html` paths.
- [ ] Complete Local Test with broadcaster, moderator, linked, and anonymous accounts.
- [ ] Complete Hosted Test from Twitch's CDN.
- [ ] Supply the review channel URL and reviewer walkthrough.
- [ ] Supply final logo, taskbar icon, discovery image, and screenshots.
- [ ] Supply author email and support email.
- [ ] Submit the Extension for Twitch review.

## Riot and broadcast permissions

- [ ] Register Pick Predict in the Riot Developer Portal.
- [ ] Submit the working product and intended Data Dragon usage for audit.
- [ ] Keep Riot's required legal boilerplate visible in the product.
- [ ] Confirm co-streaming permission separately for every league or tournament.
- [ ] Review Riot and tournament policies before every season.
- [ ] Keep predictions entertainment-only with no wagering or redeemable value.

## Production deployment

- [ ] Connect the production database and Redis environment variables in Vercel.
- [ ] Add all Twitch secrets and account allowlists in Vercel.
- [ ] Disable unprotected demo-producer mode in production.
- [ ] Promote a verified deployment to the production domain.
- [ ] Update the Twitch CDN bundle's EBS origin if the production hostname changes.
- [ ] Verify Privacy and Terms URLs on the production domain.
- [ ] Configure a custom product domain if desired.

## Broadcast automation validation

- [ ] Test recognition against LEC/LCS layouts.
- [ ] Test recognition against LCK/LPL layouts.
- [ ] Test recognition against MSI and Worlds layouts.
- [ ] Test 720p, 1080p, and common browser zoom levels.
- [ ] Test grayscale bans, animated transitions, sponsor overlays, and skin artwork.
- [ ] Measure top-1 and top-3 recognition accuracy on recorded authorized samples.
- [ ] Establish a recommended confidence threshold per broadcast layout.
- [ ] Keep moderator confirmation mandatory until accuracy targets are met.
- [ ] Revalidate the Data Dragon roster after each League patch.

## Optional live esports data

- [ ] Select a licensed esports-data provider or tournament-organizer feed.
- [ ] Configure `ESPORTS_DATA_URL` and, if required, `ESPORTS_DATA_TOKEN`.
- [ ] Map the provider's leagues, series, teams, sides, and start times.
- [ ] Add provider retry, timeout, caching, and health monitoring.
- [ ] Document data licensing and redistribution limitations.

## Security and privacy

- [ ] Add request and vote rate limiting.
- [ ] Add CSRF protection for standalone producer actions.
- [ ] Add security headers and a production Content Security Policy.
- [ ] Rotate Twitch OAuth, Extension, and session secrets on a schedule.
- [ ] Add producer/moderator audit records.
- [ ] Create viewer data export and deletion workflows.
- [ ] Finalize retention periods for predictions and opaque Twitch IDs.
- [ ] Complete a security review before public release.

## Reliability and operations

- [ ] Add structured server logs and request correlation IDs.
- [ ] Add error reporting and alerting.
- [ ] Add uptime, latency, and failed-resolution dashboards.
- [ ] Load test at expected viewer concurrency.
- [ ] Test reconnects during active voting and delayed reveal windows.
- [ ] Test rollback and disaster recovery.
- [ ] Publish a producer incident and manual-fallback playbook.

## Product launch

- [ ] Replace placeholder contact information with a real support address.
- [ ] Finalize product logo, screenshots, discovery copy, and store description.
- [ ] Recruit a small group of authorized co-streamers for beta testing.
- [ ] Run full best-of-three and best-of-five rehearsals.
- [ ] Collect viewer and producer feedback.
- [ ] Define success metrics: participation, repeat play, accuracy, retention, and failures.
- [ ] Obtain Twitch and Riot approval before public launch.
