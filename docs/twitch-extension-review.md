# Twitch Extension hosted-test and review guide

## Build the CDN asset bundle

```bash
npm run extension:package
```

Upload `dist/pick-predict-twitch-extension.zip` on the **Files** tab of the Twitch Extensions Manager.

## Asset Hosting paths

- Type: Video - Fullscreen and Panel
- Viewer Path: `panel.html`
- Video - Fullscreen View Path: `video.html`
- Config Path: `config.html`
- Panel Height: `496`

## Capabilities

- Request Identity Link: `No` (stable opaque Twitch identities are sufficient)
- Chat Capabilities: `No`
- Configuration: Extension Configuration Service is not required; configuration is stored in the Pick Predict backend.
- URL Fetching Allowlist: the production EBS hostname, currently `https://twitchleagueplugin.vercel.app`

## Backend environment

Add the base64 secret from the Extension Manager to the EBS:

```text
TWITCH_EXTENSION_SECRET=<base64 Extension secret>
```

The CDN bundle uses `https://twitchleagueplugin.vercel.app` as its hosted EBS. Promote the reviewed backend build to that production domain before Hosted Test.

## Reviewer walkthrough

1. Open the Extension configuration page as the broadcaster.
2. Create a series with blue/red team names, best-of format, voting window, and broadcast reveal delay.
3. Start the draft.
4. Open the channel as a test viewer. In the panel or video overlay, search for and select a champion.
5. In the configuration page or external producer dashboard, confirm the champion lock-in.
6. Verify that the viewer result and score remain hidden until the configured reveal delay passes.
7. Verify that the panel leaderboard updates after the delay.
8. Verify that logged-in Twitch test viewers retain their score after reloading the panel.

No payment, Bits, chat, wagering, or prizes are used. Points have no monetary value.

## Required console assets still supplied manually

The Extensions Manager requires a logo, taskbar icon, discovery image, screenshot, author/support email, review channel URL, and public Terms and Privacy URLs. Use:

- Terms: `https://twitchleagueplugin.vercel.app/terms.html`
- Privacy: `https://twitchleagueplugin.vercel.app/privacy.html`

Do not submit until Twitch OAuth/Extension secrets are configured and the production backend uses durable shared storage.
