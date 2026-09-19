import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { verifyExtensionJwt } from "../src/extension-auth.js";

const makeToken = (secret, payload) => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", Buffer.from(secret, "base64")).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
};

test("verifies Twitch Extension HS256 identity claims", () => {
  const previous = process.env.TWITCH_EXTENSION_SECRET;
  const secret = randomBytes(32).toString("base64");
  process.env.TWITCH_EXTENSION_SECRET = secret;
  const token = makeToken(secret, { exp: Math.floor(Date.now() / 1000) + 60, channel_id: "channel-1", opaque_user_id: "U-user-1", role: "viewer" });
  const payload = verifyExtensionJwt({ headers: { "x-extension-jwt": token } });
  assert.equal(payload.channel_id, "channel-1");
  assert.equal(payload.opaque_user_id, "U-user-1");
  if (previous === undefined) delete process.env.TWITCH_EXTENSION_SECRET; else process.env.TWITCH_EXTENSION_SECRET = previous;
});

test("rejects tampered and expired Extension tokens", () => {
  const previous = process.env.TWITCH_EXTENSION_SECRET;
  const secret = randomBytes(32).toString("base64");
  process.env.TWITCH_EXTENSION_SECRET = secret;
  const expired = makeToken(secret, { exp: Math.floor(Date.now() / 1000) - 1, channel_id: "channel-1", opaque_user_id: "U-user-1", role: "viewer" });
  assert.throws(() => verifyExtensionJwt({ headers: { authorization: `Bearer ${expired}` } }), /expired/);
  const valid = makeToken(secret, { exp: Math.floor(Date.now() / 1000) + 60, channel_id: "channel-1", opaque_user_id: "U-user-1", role: "viewer" });
  assert.throws(() => verifyExtensionJwt({ headers: { "x-extension-jwt": `${valid.slice(0, -1)}x` } }), /signature/);
  if (previous === undefined) delete process.env.TWITCH_EXTENSION_SECRET; else process.env.TWITCH_EXTENSION_SECRET = previous;
});
