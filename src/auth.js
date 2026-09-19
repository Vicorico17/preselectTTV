import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const production = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const secret = () => process.env.SESSION_SECRET || "pick-predict-local-development-only";
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = value => createHmac("sha256", secret()).update(value).digest("base64url");
const pack = value => { const payload = encode(value); return `${payload}.${sign(payload)}`; };
const unpack = token => {
  try {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) return null;
    const expected = sign(payload);
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch { return null; }
};
const cookies = req => Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map(part => {
  const index = part.indexOf("="); return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
}));
const setCookie = (res, name, value, { maxAge = 60 * 60 * 24 * 7 } = {}) => {
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production ? "; Secure" : ""}`;
  const existing = res.getHeader("set-cookie") || [];
  res.setHeader("set-cookie", [...(Array.isArray(existing) ? existing : [existing]), cookie]);
};
const ids = name => new Set(String(process.env[name] || "").split(",").map(x => x.trim()).filter(Boolean));

export const twitchConfigured = () => Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.SESSION_SECRET);
export const authFor = req => {
  if (!twitchConfigured()) return { configured: false, authenticated: true, producer: true, role: "demo", user: { displayName: "Demo producer" } };
  const session = unpack(cookies(req).pp_session);
  if (!session || session.expiresAt < Date.now()) return { configured: true, authenticated: false, producer: false, role: "viewer", user: null };
  const broadcasters = ids("TWITCH_BROADCASTER_IDS");
  const moderators = ids("TWITCH_MODERATOR_IDS");
  const role = broadcasters.has(session.id) ? "broadcaster" : moderators.has(session.id) ? "moderator" : "viewer";
  return { configured: true, authenticated: true, producer: role !== "viewer", role, user: session };
};

export function beginTwitchAuth(req, res) {
  if (!twitchConfigured()) throw new Error("Twitch OAuth is not configured.");
  const state = randomBytes(24).toString("hex");
  setCookie(res, "pp_oauth_state", pack({ state, expiresAt: Date.now() + 10 * 60 * 1000 }), { maxAge: 600 });
  const redirectUri = process.env.TWITCH_REDIRECT_URI || `${production ? "https" : "http"}://${req.headers.host}/api/auth/callback`;
  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", scope: "", state }).toString();
  res.writeHead(302, { location: url.toString() }); res.end();
}

export async function finishTwitchAuth(req, res, url) {
  const saved = unpack(cookies(req).pp_oauth_state);
  if (!saved || saved.expiresAt < Date.now() || saved.state !== url.searchParams.get("state")) throw new Error("OAuth state did not match.");
  if (url.searchParams.get("error")) throw new Error(url.searchParams.get("error_description") || "Twitch authorization was declined.");
  const redirectUri = process.env.TWITCH_REDIRECT_URI || `${production ? "https" : "http"}://${req.headers.host}/api/auth/callback`;
  const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, client_secret: process.env.TWITCH_CLIENT_SECRET, code: url.searchParams.get("code"), grant_type: "authorization_code", redirect_uri: redirectUri })
  });
  if (!tokenResponse.ok) throw new Error("Twitch token exchange failed.");
  const token = await tokenResponse.json();
  const userResponse = await fetch("https://api.twitch.tv/helix/users", { headers: { "Client-Id": process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token.access_token}` } });
  if (!userResponse.ok) throw new Error("Could not read the Twitch profile.");
  const user = (await userResponse.json()).data?.[0];
  if (!user) throw new Error("Twitch returned no user profile.");
  setCookie(res, "pp_session", pack({ id: user.id, login: user.login, displayName: user.display_name, imageUrl: user.profile_image_url, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  setCookie(res, "pp_oauth_state", "", { maxAge: 0 });
  res.writeHead(302, { location: "/control" }); res.end();
}

export function logout(res) {
  setCookie(res, "pp_session", "", { maxAge: 0 });
  res.writeHead(302, { location: "/control" }); res.end();
}
