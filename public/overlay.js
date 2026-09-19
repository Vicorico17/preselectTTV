const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
let state;
async function refresh(){state=await fetch("/api/state",{cache:"no-store"}).then(r=>r.json());render()}
function render(){
  const root=document.querySelector("#overlay");
  if(!state?.match){root.innerHTML="";return}
  const {match,round,voteBreakdown,leaderboard,lastAction}=state;
  const team=round?(round.side==="blue"?match.blueTeam:match.redTeam):"";
  const revealed=lastAction?.status==="resolved"&&lastAction.champion;
  root.innerHTML=`<section class="overlay-panel">${revealed?`<div class="reveal-banner">${escapeHtml(lastAction.side==="blue"?match.blueTeam:match.redTeam)} locked <strong>${escapeHtml(lastAction.champion)}</strong> · ${lastAction.correctVotes||0}/${lastAction.totalVotes||0} analysts correct</div>`:""}<div class="overlay-row"><div><div class="eyebrow">Pick Predict · ${escapeHtml(match.seriesName)} · Game ${state.game}</div><h1 class="overlay-title">${round?`${escapeHtml(team)} ${round.kind} ${round.slot}`:state.status==="complete"?"Draft complete":"Waiting for draft"}</h1></div><div id="overlay-timer" class="timer"></div></div>${round?`<div class="overlay-votes">${voteBreakdown.slice(0,3).map(v=>`<div class="overlay-vote"><strong>${escapeHtml(v.champion)}</strong><span>${v.percentage}% · ${v.votes} vote${v.votes===1?"":"s"}</span></div>`).join("")||`<div class="help">Waiting for the first predictions…</div>`}</div>`:""}</section><aside class="overlay-board"><div class="eyebrow">Series leaders</div>${leaderboard.slice(0,5).map((viewer,index)=>`<div class="leader-row"><div class="rank">${index+1}</div><div><div class="leader-name">${escapeHtml(viewer.name)}</div><div class="leader-meta">${viewer.streak} streak</div></div><div class="score">${viewer.seriesScore}</div></div>`).join("")||`<div class="empty">No predictions yet</div>`}</aside>`;
  timer();
}
function timer(){const el=document.querySelector("#overlay-timer");if(!el||!state?.round)return;const left=Math.max(0,state.round.closesAt-Date.now());el.textContent=state.round.status==="open"?`${Math.ceil(left/1000)}s`:"CLOSED";el.classList.toggle("closed",state.round.status!=="open")}
new EventSource("/api/events").addEventListener("refresh",refresh);setInterval(timer,200);setInterval(refresh,3000);refresh();
