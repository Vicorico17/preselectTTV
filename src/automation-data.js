let catalogCache = null;
let catalogExpiresAt = 0;

export async function championCatalog() {
  if (catalogCache && Date.now() < catalogExpiresAt) return catalogCache;
  const versionsResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
  if (!versionsResponse.ok) throw new Error("Could not load Data Dragon versions.");
  const [version] = await versionsResponse.json();
  const catalogResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
  if (!catalogResponse.ok) throw new Error("Could not load the champion catalog.");
  const data = (await catalogResponse.json()).data;
  catalogCache = {
    version,
    champions: Object.values(data).map(champion => ({
      id: champion.id,
      name: champion.name,
      imageUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.image.full}`
    })).sort((a, b) => a.name.localeCompare(b.name))
  };
  catalogExpiresAt = Date.now() + 6 * 60 * 60 * 1000;
  return catalogCache;
}

export async function liveEsportsMatches() {
  const endpoint = process.env.ESPORTS_DATA_URL;
  if (!endpoint) return { configured: false, matches: [] };
  const response = await fetch(endpoint, {
    headers: process.env.ESPORTS_DATA_TOKEN ? { Authorization: `Bearer ${process.env.ESPORTS_DATA_TOKEN}` } : {}
  });
  if (!response.ok) throw new Error(`Esports data provider returned ${response.status}.`);
  const payload = await response.json();
  const matches = (Array.isArray(payload) ? payload : payload.matches || []).map(match => ({
    id: String(match.id),
    seriesName: String(match.seriesName || match.event || match.league || "Live esports series"),
    blueTeam: String(match.blueTeam || match.teams?.[0]?.name || "Blue team"),
    redTeam: String(match.redTeam || match.teams?.[1]?.name || "Red team"),
    bestOf: Math.max(1, Math.min(7, Number(match.bestOf) || 3)),
    startsAt: match.startsAt || null
  }));
  return { configured: true, matches };
}
