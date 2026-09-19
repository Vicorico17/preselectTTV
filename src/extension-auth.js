import { createHmac, timingSafeEqual } from "node:crypto";

const parseToken = req => {
  const direct = req.headers["x-extension-jwt"];
  if (direct) return String(direct);
  const authorization = String(req.headers.authorization || "");
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
};

export function verifyExtensionJwt(req) {
  const token = parseToken(req);
  if (!token) return null;
  const secret = process.env.TWITCH_EXTENSION_SECRET;
  if (!secret) throw new Error("Twitch Extension authentication is not configured.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed Extension token.");
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
  if (header.alg !== "HS256") throw new Error("Unsupported Extension token algorithm.");
  const expected = createHmac("sha256", Buffer.from(secret, "base64")).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid Extension token signature.");
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error("Extension token expired.");
  if (!payload.channel_id || !payload.opaque_user_id) throw new Error("Extension token is missing identity claims.");
  return payload;
}
