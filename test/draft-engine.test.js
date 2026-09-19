import test from "node:test";
import assert from "node:assert/strict";
import { CHAMPIONS, DRAFT_SEQUENCE, DraftEngine } from "../src/draft-engine.js";

const create = () => {
  let time = 1_000_000;
  const engine = new DraftEngine({ now: () => time, roundSeconds: 20 });
  engine.createMatch({ seriesName: "Test Cup", blueTeam: "Blue", redTeam: "Red", bestOf: 3 });
  engine.join("a", "Alice");
  engine.join("b", "Bob");
  return { engine, advance: ms => time += ms };
};

test("uses the complete 20-action professional draft order", () => {
  assert.equal(DRAFT_SEQUENCE.length, 20);
  assert.deepEqual(DRAFT_SEQUENCE.slice(0, 6).map(x => `${x.side}-${x.kind}`), [
    "blue-ban", "red-ban", "blue-ban", "red-ban", "blue-ban", "red-ban"
  ]);
  assert.deepEqual(DRAFT_SEQUENCE.slice(-4).map(x => `${x.side}-${x.kind}`), [
    "red-pick", "blue-pick", "blue-pick", "red-pick"
  ]);
});

test("locks votes at the server deadline", () => {
  const { engine, advance } = create();
  engine.startDraft();
  engine.predict("a", "Ahri");
  advance(20_000);
  assert.throws(() => engine.predict("b", "Akali"), /closed/);
  assert.equal(engine.publicState().round.status, "closed");
});

test("scores correct calls, rarity, and streaks", () => {
  const { engine } = create();
  engine.startDraft();
  engine.predict("a", "Ahri");
  engine.predict("b", "Akali");
  engine.resolve("Ahri");
  let alice = engine.viewers.get("a");
  assert.equal(alice.gameScore, 100); // 75 ban + 25 rarity
  assert.equal(alice.streak, 1);

  engine.predict("a", "Aatrox");
  engine.resolve("Aatrox");
  alice = engine.viewers.get("a");
  assert.equal(alice.gameScore, 195); // 75 + 20 streak; no rarity bonus on a unanimous round
  assert.equal(alice.streak, 2);
});

test("undo restores scores and reopens the previous action", () => {
  const { engine } = create();
  engine.startDraft();
  engine.predict("a", "Ahri");
  engine.resolve("Ahri");
  assert.ok(engine.viewers.get("a").gameScore > 0);
  engine.undoLast();
  assert.equal(engine.currentIndex, 0);
  assert.equal(engine.round.index, 0);
  assert.equal(engine.viewers.get("a").gameScore, 0);
  assert.equal(engine.viewers.get("a").attempts, 0);
});

test("cancel advances without scoring and twenty actions finish the draft", () => {
  const { engine } = create();
  engine.startDraft();
  engine.cancelRound();
  assert.equal(engine.currentIndex, 1);
  assert.equal(engine.viewers.get("a").attempts, 0);
  for (let i = 1; i < DRAFT_SEQUENCE.length; i++) engine.resolve(CHAMPIONS[i]);
  assert.equal(engine.status, "complete");
  assert.equal(engine.round, null);
  assert.equal(engine.actions.length, 20);
});

test("new game preserves series points while reset removes current-game points", () => {
  const { engine } = create();
  engine.startDraft();
  engine.predict("a", "Ahri");
  engine.resolve("Ahri");
  const award = engine.viewers.get("a").seriesScore;
  engine.newGame();
  assert.equal(engine.viewers.get("a").gameScore, 0);
  assert.equal(engine.viewers.get("a").seriesScore, award);
  engine.startDraft();
  engine.predict("a", "Akali");
  engine.resolve("Akali");
  assert.ok(engine.viewers.get("a").seriesScore > award);
  engine.resetGame();
  assert.equal(engine.viewers.get("a").seriesScore, award);
});
