import test from "node:test";
import assert from "node:assert/strict";
import { liveEsportsMatches } from "../src/automation-data.js";

test("licensed esports adapter is optional", async () => {
  const previous = process.env.ESPORTS_DATA_URL;
  delete process.env.ESPORTS_DATA_URL;
  assert.deepEqual(await liveEsportsMatches(), { configured: false, matches: [] });
  if (previous !== undefined) process.env.ESPORTS_DATA_URL = previous;
});

test("normalizes licensed provider match metadata", async () => {
  const previousUrl = process.env.ESPORTS_DATA_URL;
  const previousFetch = global.fetch;
  process.env.ESPORTS_DATA_URL = "https://licensed.example/live";
  global.fetch = async () => ({ ok: true, json: async () => ({ matches: [{ id: 42, event: "Final", teams: [{ name: "Blue" }, { name: "Red" }], bestOf: 5 }] }) });
  const result = await liveEsportsMatches();
  assert.equal(result.configured, true);
  assert.deepEqual(result.matches[0], { id: "42", seriesName: "Final", blueTeam: "Blue", redTeam: "Red", bestOf: 5, startsAt: null });
  global.fetch = previousFetch;
  if (previousUrl === undefined) delete process.env.ESPORTS_DATA_URL; else process.env.ESPORTS_DATA_URL = previousUrl;
});
