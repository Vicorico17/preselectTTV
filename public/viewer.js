let viewerId = localStorage.getItem("pick-predict-viewer");
let state = null;
let boardMode = "seriesScore";
let search = "";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const initials = name => name.split(/\s|'/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase();
const api = async (path, data) => {
  const response = await fetch(`/api/${path}`, { method:"POST", headers:{"content-type":"application/json", ...(viewerId ? {"x-viewer-id":viewerId}:{})}, body:JSON.stringify(data || {}) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error);
  return json;
};
const toast = message => { const el=document.createElement("div"); el.className="toast"; el.textContent=message; document.body.append(el); setTimeout(()=>el.remove(),2200); };

async function refresh() {
  const response = await fetch(`/api/state${viewerId ? `?viewerId=${encodeURIComponent(viewerId)}`:""}`, {cache:"no-store"});
  state = await response.json();
  render();
}

function render() {
  if (!viewerId) $("#join").classList.remove("hidden");
  const app = $("#app");
  if (!state?.match) {
    app.innerHTML = `<section class="card notice"><div class="eyebrow">Broadcast lobby</div><h1>The desk is getting ready.</h1><p>The prediction game will appear here as soon as the producer creates a match.</p></section>`;
    return;
  }
  const {match, round, actions, leaderboard} = state;
  const team = round ? (round.side === "blue" ? match.blueTeam : match.redTeam) : "";
  const available = state.champions.filter(champion => champion.toLowerCase().includes(search.toLowerCase()));
  const roundOpen = round?.status === "open";
  const title = round ? `${escapeHtml(team)} ${round.kind} ${round.slot}` : state.status === "complete" ? "Draft complete" : "Waiting for the draft";
  const revealed = state.lastAction?.status === "resolved" && state.lastAction.champion;
  app.innerHTML = `<div class="layout">
    <section class="card hero">
      ${revealed ? `<div class="reveal-banner">${escapeHtml(state.lastAction.side === "blue" ? match.blueTeam : match.redTeam)} locked <strong>${escapeHtml(state.lastAction.champion)}</strong> · ${state.lastAction.correctVotes || 0}/${state.lastAction.totalVotes || 0} correct</div>` : ""}
      <div class="eyebrow">${escapeHtml(match.seriesName)} · Game ${state.game} · Best of ${match.bestOf}</div>
      <div class="match-line"><div class="team blue-text">${escapeHtml(match.blueTeam)}</div><div class="versus">VS</div><div class="team red red-text">${escapeHtml(match.redTeam)}</div></div>
      <div class="round-heading"><div><div class="eyebrow">${round ? `${round.side} side · predict the next ${round.kind}` : "Draft status"}</div><h1 class="round-title">${title}</h1></div><div id="timer" class="timer"></div></div>
      <div class="progress"><div id="progress"></div></div>
      ${round ? `<input class="search" id="search" value="${escapeHtml(search)}" placeholder="Search ${state.champions.length} champions…" ${roundOpen?"":"disabled"}>
      <div class="champions">${available.map(champion => `<button class="champion ${state.myPrediction===champion?"selected":""}" data-champion="${escapeHtml(champion)}" ${roundOpen?"":"disabled"}><span class="initials">${initials(champion)}</span><span class="champion-name">${escapeHtml(champion)}</span></button>`).join("")}</div>` : `<div class="empty">${state.status === "complete" ? "Final calls are in. Check the leaderboard." : "The producer will open predictions shortly."}</div>`}
      <div class="draft-strip">${Array.from({length:20},(_,i)=>{const done=actions[i]; const current=round?.index===i; const side=done?.side || (current?round.side:""); return `<div class="draft-step ${side} ${done?"done":""} ${current?"current":""}" title="${done?`${done.kind}: ${done.champion||"cancelled"}`:`Action ${i+1}`}">${i+1}</div>`}).join("")}</div>
    </section>
    <aside class="card side-card"><h2 class="card-title">Live leaderboard</h2><div class="tabs"><button class="tab ${boardMode==="gameScore"?"active":""}" data-mode="gameScore">Game</button><button class="tab ${boardMode==="seriesScore"?"active":""}" data-mode="seriesScore">Series</button></div><div id="leaders">${leaderboard.length ? [...leaderboard].sort((a,b)=>b[boardMode]-a[boardMode]).slice(0,12).map((viewer,i)=>`<div class="leader-row"><div class="rank">${String(i+1).padStart(2,"0")}</div><div><div class="leader-name">${escapeHtml(viewer.name)}</div><div class="leader-meta">${viewer.correct}/${viewer.attempts} correct · ${viewer.streak} streak</div></div><div class="score">${viewer[boardMode]}</div></div>`).join("") : `<div class="empty">No analysts yet.</div>`}</div></aside>
  </div>`;
  $("#search")?.addEventListener("input", event => { search=event.target.value; render(); $("#search")?.focus(); });
  document.querySelectorAll("[data-champion]").forEach(button => button.addEventListener("click", async()=>{ try { await api("predict",{champion:button.dataset.champion}); toast(`Locked ${button.dataset.champion}`); await refresh(); } catch(error){toast(error.message)} }));
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click",()=>{boardMode=button.dataset.mode;render()}));
  updateTimer();
}

function updateTimer(){
  const timer=$("#timer"), progress=$("#progress"); if(!timer||!state?.round){if(timer)timer.textContent="";return}
  const left=Math.max(0,state.round.closesAt-Date.now());
  timer.textContent=state.round.status==="open"?`${Math.ceil(left/1000)}s`:"VOTING CLOSED";
  timer.classList.toggle("closed",state.round.status!=="open");
  if(progress) progress.style.width=`${Math.max(0,Math.min(100,left/(state.roundSeconds*10)))}%`;
}

$("#join-form").addEventListener("submit", async event => { event.preventDefault(); try { const json=await api("join",{name:$("#name").value}); viewerId=json.result.viewerId; localStorage.setItem("pick-predict-viewer",viewerId); $("#join").classList.add("hidden"); await refresh(); } catch(error){toast(error.message)} });
new EventSource("/api/events").addEventListener("refresh",refresh);
setInterval(updateTimer,200);
setInterval(refresh,3000);
refresh();
