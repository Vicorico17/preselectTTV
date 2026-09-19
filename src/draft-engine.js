import { randomUUID } from "node:crypto";

export const CHAMPIONS = [
  "Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia", "Annie", "Aphelios",
  "Ashe", "Aurelion Sol", "Aurora", "Azir", "Bard", "Bel'Veth", "Blitzcrank", "Brand", "Braum", "Briar",
  "Caitlyn", "Camille", "Cassiopeia", "Cho'Gath", "Corki", "Darius", "Diana", "Dr. Mundo", "Draven", "Ekko",
  "Elise", "Evelynn", "Ezreal", "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank", "Garen", "Gnar",
  "Gragas", "Graves", "Gwen", "Hecarim", "Heimerdinger", "Hwei", "Illaoi", "Irelia", "Ivern", "Janna",
  "Jarvan IV", "Jax", "Jayce", "Jhin", "Jinx", "K'Sante", "Kai'Sa", "Kalista", "Karma", "Karthus",
  "Kassadin", "Katarina", "Kayle", "Kayn", "Kennen", "Kha'Zix", "Kindred", "Kled", "Kog'Maw", "LeBlanc",
  "Lee Sin", "Leona", "Lillia", "Lissandra", "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai",
  "Master Yi", "Mel", "Milio", "Miss Fortune", "Mordekaiser", "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus",
  "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu & Willump", "Olaf", "Orianna", "Ornn", "Pantheon", "Poppy",
  "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "Rek'Sai", "Rell", "Renata Glasc", "Renekton", "Rengar",
  "Riven", "Rumble", "Ryze", "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shaco", "Shen",
  "Shyvana", "Singed", "Sion", "Sivir", "Skarner", "Smolder", "Sona", "Soraka", "Swain", "Sylas",
  "Syndra", "Tahm Kench", "Taliyah", "Talon", "Taric", "Teemo", "Thresh", "Tristana", "Trundle", "Tryndamere",
  "Twisted Fate", "Twitch", "Udyr", "Urgot", "Varus", "Vayne", "Veigar", "Vel'Koz", "Vex", "Vi",
  "Viego", "Viktor", "Vladimir", "Volibear", "Warwick", "Wukong", "Xayah", "Xerath", "Xin Zhao", "Yasuo",
  "Yone", "Yorick", "Yunara", "Yuumi", "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra"
];

export const DRAFT_SEQUENCE = [
  ["ban", "blue", 1], ["ban", "red", 1], ["ban", "blue", 2], ["ban", "red", 2], ["ban", "blue", 3], ["ban", "red", 3],
  ["pick", "blue", 1], ["pick", "red", 1], ["pick", "red", 2], ["pick", "blue", 2], ["pick", "blue", 3], ["pick", "red", 3],
  ["ban", "red", 4], ["ban", "blue", 4], ["ban", "red", 5], ["ban", "blue", 5],
  ["pick", "red", 4], ["pick", "blue", 4], ["pick", "blue", 5], ["pick", "red", 5]
].map(([kind, side, slot], index) => ({ index, kind, side, slot }));

const freshViewer = (id, name) => ({
  id, name, gameScore: 0, seriesScore: 0, correct: 0, attempts: 0, streak: 0, bestStreak: 0
});

export class DraftEngine {
  constructor({ now = () => Date.now(), roundSeconds = 20 } = {}) {
    this.now = now;
    this.roundSeconds = roundSeconds;
    this.viewers = new Map();
    this.predictions = new Map();
    this.setup();
  }

  setup() {
    this.match = null;
    this.game = 1;
    this.status = "setup";
    this.currentIndex = 0;
    this.round = null;
    this.actions = [];
  }

  createMatch({ seriesName, blueTeam, redTeam, bestOf = 3, roundSeconds }) {
    if (!blueTeam?.trim() || !redTeam?.trim()) throw new Error("Both team names are required.");
    this.match = {
      id: randomUUID(),
      seriesName: seriesName?.trim() || "Live series",
      blueTeam: blueTeam.trim(),
      redTeam: redTeam.trim(),
      bestOf: Math.max(1, Math.min(7, Number(bestOf) || 3))
    };
    if (roundSeconds) this.roundSeconds = Math.max(5, Math.min(90, Number(roundSeconds)));
    this.game = 1;
    this.status = "ready";
    this.currentIndex = 0;
    this.round = null;
    this.actions = [];
    this.predictions.clear();
    for (const viewer of this.viewers.values()) Object.assign(viewer, freshViewer(viewer.id, viewer.name));
    return this.publicState();
  }

  join(id, name) {
    const cleanName = String(name || "Analyst").trim().slice(0, 24) || "Analyst";
    const existing = this.viewers.get(id);
    if (existing) existing.name = cleanName;
    else this.viewers.set(id, freshViewer(id, cleanName));
    return this.viewers.get(id);
  }

  startDraft() {
    if (!this.match) throw new Error("Create a match first.");
    if (!["ready", "complete"].includes(this.status)) throw new Error("The draft is already live.");
    if (this.status === "complete") this.newGame();
    this.status = "live";
    this.currentIndex = 0;
    this.actions = [];
    this.openRound();
  }

  newGame() {
    if (!this.match) throw new Error("Create a match first.");
    this.game += 1;
    this.status = "ready";
    this.currentIndex = 0;
    this.round = null;
    this.actions = [];
    this.predictions.clear();
    for (const viewer of this.viewers.values()) {
      viewer.gameScore = 0;
      viewer.correct = 0;
      viewer.attempts = 0;
      viewer.streak = 0;
      viewer.bestStreak = 0;
    }
  }

  openRound() {
    const action = DRAFT_SEQUENCE[this.currentIndex];
    if (!action) {
      this.status = "complete";
      this.round = null;
      return;
    }
    const openedAt = this.now();
    this.round = {
      id: randomUUID(), ...action, status: "open", openedAt,
      closesAt: openedAt + this.roundSeconds * 1000
    };
    this.predictions.set(this.round.id, new Map());
  }

  closeExpired() {
    if (this.round?.status === "open" && this.now() >= this.round.closesAt) this.round.status = "closed";
  }

  predict(viewerId, champion) {
    this.closeExpired();
    if (!this.viewers.has(viewerId)) throw new Error("Join before predicting.");
    if (!this.round || this.round.status !== "open") throw new Error("Voting is closed.");
    if (!CHAMPIONS.includes(champion)) throw new Error("Unknown champion.");
    this.predictions.get(this.round.id).set(viewerId, champion);
  }

  resolve(champion) {
    if (!this.round || !["open", "closed"].includes(this.round.status)) throw new Error("There is no round to resolve.");
    if (!CHAMPIONS.includes(champion)) throw new Error("Unknown champion.");
    const votes = this.predictions.get(this.round.id) || new Map();
    const totalVotes = votes.size;
    const correctVotes = [...votes.values()].filter(value => value === champion).length;
    const base = this.round.kind === "pick" ? 100 : 75;
    const rarityBonus = correctVotes ? Math.round((1 - correctVotes / Math.max(totalVotes, 1)) * 50) : 0;
    const scoreChanges = [];

    for (const [viewerId, viewer] of this.viewers) {
      const prediction = votes.get(viewerId);
      if (!prediction) continue;
      const before = { ...viewer };
      viewer.attempts += 1;
      let award = 0;
      if (prediction === champion) {
        const streakBonus = Math.min(viewer.streak * 20, 100);
        award = base + rarityBonus + streakBonus;
        viewer.correct += 1;
        viewer.streak += 1;
        viewer.bestStreak = Math.max(viewer.bestStreak, viewer.streak);
        viewer.gameScore += award;
        viewer.seriesScore += award;
      } else {
        viewer.streak = 0;
      }
      scoreChanges.push({ viewerId, before, award, correct: prediction === champion });
    }

    this.actions.push({ ...this.round, status: "resolved", champion, totalVotes, correctVotes, base, rarityBonus, scoreChanges });
    this.currentIndex += 1;
    this.openRound();
  }

  cancelRound() {
    if (!this.round) throw new Error("There is no active round.");
    this.actions.push({ ...this.round, status: "cancelled", scoreChanges: [] });
    this.currentIndex += 1;
    this.openRound();
  }

  undoLast() {
    const last = this.actions.pop();
    if (!last) throw new Error("There is no completed action to undo.");
    for (const change of last.scoreChanges || []) {
      const viewer = this.viewers.get(change.viewerId);
      if (viewer) Object.assign(viewer, change.before);
    }
    this.currentIndex = last.index;
    this.status = "live";
    this.openRound();
  }

  resetGame() {
    for (const viewer of this.viewers.values()) {
      viewer.seriesScore = Math.max(0, viewer.seriesScore - viewer.gameScore);
      viewer.gameScore = 0;
      viewer.correct = 0;
      viewer.attempts = 0;
      viewer.streak = 0;
      viewer.bestStreak = 0;
    }
    this.currentIndex = 0;
    this.actions = [];
    this.predictions.clear();
    this.round = null;
    this.status = "ready";
  }

  publicState(viewerId) {
    this.closeExpired();
    const votes = this.round ? this.predictions.get(this.round.id) : null;
    const leaderboard = [...this.viewers.values()]
      .sort((a, b) => b.seriesScore - a.seriesScore || b.gameScore - a.gameScore || a.name.localeCompare(b.name))
      .map(({ id, name, gameScore, seriesScore, correct, attempts, streak, bestStreak }) =>
        ({ id, name, gameScore, seriesScore, correct, attempts, streak, bestStreak }));
    return {
      match: this.match,
      game: this.game,
      status: this.status,
      roundSeconds: this.roundSeconds,
      round: this.round ? { ...this.round, voteCount: votes?.size || 0 } : null,
      myPrediction: viewerId && votes ? votes.get(viewerId) || null : null,
      actions: this.actions.map(({ scoreChanges, ...action }) => action),
      leaderboard,
      champions: CHAMPIONS
    };
  }
}
