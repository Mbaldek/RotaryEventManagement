// Builder pur : modèle de deck -> document HTML autonome (string).
// Deck plein écran navy/gold, navigation clavier (flèches/espace), hors-ligne.
// Grammaire calquée sur docs/presentation/session_5_greentech.html.
// Aucune dépendance réseau/DB. Cf. blueprint §6.3.

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// innerHtml MUST be pre-escaped HTML (built with escapeHtml) — never pass raw model data.
const stage = (id, innerHtml) => `<section class="stage" id="${id}">${innerHtml}</section>`;

function lineupRows(startups) {
  return startups.map((s, i) => `
    <div class="lineup-row">
      <span class="num">${i + 1}</span>
      <span class="who">${escapeHtml(s.name)}${s.founder ? ` · ${escapeHtml(s.founder)}` : ''}</span>
    </div>`).join('');
}

function criteriaRows(criteria) {
  return criteria.map((c, i) => `
    <div class="crit-row">
      <span class="num">${i + 1}</span>
      <span class="crit-name">${escapeHtml(c.name)}</span>
      <span class="crit-tag">${escapeHtml(c.tagline || '')}</span>
      <span class="crit-scale">0 — 5</span>
    </div>`).join('');
}

function pitchPairs(startups) {
  return startups.map((s, i) => {
    const n = i + 1;
    const trans = stage(`s-trans-${n}`, `
      <p class="eyebrow">PITCH ${n}</p>
      <h2 class="title">${escapeHtml(s.name)}</h2>
      <p class="sub">pitched by ${escapeHtml(s.founder || '')}</p>
      <p class="floor">The floor is yours.</p>`);
    const qa = stage(`s-qa-${n}`, `
      <p class="eyebrow">PITCH ${n} · COMPLETE</p>
      <h2 class="title">Q&amp;A.</h2>
      <p class="sub">${escapeHtml(s.name)} · pitched by ${escapeHtml(s.founder || '')}</p>
      <p class="floor">QUESTIONS FROM THE JURY</p>`);
    return trans + qa;
  }).join('');
}

const NAV_SCRIPT = `
<script>
(function(){
  var stages = Array.prototype.slice.call(document.querySelectorAll('.stage'));
  var i = 0;
  function show(n){ stages.forEach(function(s,k){ s.classList.toggle('active', k===n); });
    var c = document.getElementById('counter'); if(c) c.textContent = (n+1)+' / '+stages.length; }
  function go(d){ i = Math.max(0, Math.min(stages.length-1, i+d)); show(i); }
  document.addEventListener('keydown', function(e){
    if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].indexOf(e.key)>-1){ e.preventDefault(); go(1); }
    else if(['ArrowLeft','ArrowUp','PageUp'].indexOf(e.key)>-1){ e.preventDefault(); go(-1); }
    else if(e.key==='Home'){ i=0; show(0); } else if(e.key==='End'){ i=stages.length-1; show(i); }
  });
  document.addEventListener('click', function(){ go(1); });
  show(0);
})();
</script>`;

const STYLE = `
<style>
  :root{ --blue:#245AA0; --blue-deep:#1B4480; --blue-night:#0A1F40; --gold:#C9A84C; --gold-light:#E0C880; --white:#fff; --ink-soft:#D8E2F0; }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100vh;overflow:hidden;background:var(--blue-deep);font-family:'Inter',system-ui,sans-serif;color:var(--white)}
  .stage{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;opacity:0;visibility:hidden;transition:opacity .6s ease,visibility .6s;padding:6vh 8vw;text-align:center;background:radial-gradient(ellipse 80% 60% at 50% 100%,var(--blue) 0%,var(--blue-deep) 50%,var(--blue-night) 100%)}
  .stage.active{opacity:1;visibility:visible}
  .eyebrow{font-size:.8rem;letter-spacing:.35em;color:var(--gold-light);text-transform:uppercase}
  .title{font-family:'Playfair Display',Georgia,serif;font-size:clamp(2rem,6vw,4.5rem);font-weight:700}
  .sub{font-size:1.2rem;color:var(--ink-soft)}
  .floor{font-style:italic;color:var(--gold-light)}
  .lineup-row,.crit-row{display:flex;align-items:center;gap:1rem;font-size:1.3rem}
  .num{font-family:'Playfair Display',serif;color:var(--gold);min-width:1.5em}
  .crit-name{font-weight:600}.crit-tag{color:var(--ink-soft);font-style:italic}.crit-scale{color:var(--gold);margin-left:auto}
  .agenda-item{font-size:1.3rem;color:var(--ink-soft)}
  #counter{position:fixed;bottom:2vh;left:2vw;font-family:'Playfair Display',serif;font-style:italic;color:var(--gold);opacity:.4;z-index:100}
  .logo-mark{position:fixed;top:4vh;left:4vw;font-size:11px;letter-spacing:.4em;color:var(--gold-light);z-index:100}
</style>`;

export function buildSessionDeckHtml(model) {
  const m = model || {};
  const startups = Array.isArray(m.startups) ? m.startups : [];
  const criteria = Array.isArray(m.criteria) ? m.criteria : [];
  const jury = Array.isArray(m.jury) ? m.jury : [];
  const agenda = Array.isArray(m.agenda) ? m.agenda : [];

  const slides = [
    stage('s-wait', `<p class="eyebrow">ROTARY STARTUP AWARD</p><h2 class="title">${escapeHtml(m.sessionName)}</h2><p class="sub">Please wait — the session is about to begin.</p>`),
    stage('s-splash', `<p class="eyebrow">${escapeHtml(m.theme || '')}</p><h2 class="title">${escapeHtml(m.sessionName)}</h2><p class="sub">${escapeHtml(m.dateLabel || '')}${m.timeLabel ? ` · ${escapeHtml(m.timeLabel)}` : ''}</p>`),
    stage('s-special', `<p class="eyebrow">SPECIAL PRIZE</p><h2 class="title">${escapeHtml(m.specialPrize || '')}</h2>`),
    stage('s-agenda', `<p class="eyebrow">AGENDA</p>${agenda.map((a) => `<p class="agenda-item">${escapeHtml(a)}</p>`).join('')}`),
    stage('s-lineup', `<p class="eyebrow">TONIGHT'S STARTUPS</p><h2 class="title">${startups.length} founders, ${startups.length} pitches.</h2><div>${lineupRows(startups)}</div>`),
    stage('s-jury', `<p class="eyebrow">THE JURY</p>${jury.map((j) => `<p class="agenda-item">${escapeHtml(j)}</p>`).join('')}`),
    stage('s-scoring', `<p class="eyebrow">JURY SCORING</p><h2 class="title">${criteria.length} criteria, one ranked score.</h2><div>${criteriaRows(criteria)}</div>`),
    stage('s-ready', `<p class="eyebrow">READY</p><h2 class="title">Let's begin.</h2>`),
    pitchPairs(startups),
    stage('s-end', `<p class="eyebrow">THANK YOU</p><h2 class="title">${escapeHtml(m.sessionName)}</h2><p class="sub">Deliberation follows.</p>`),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(m.sessionName)} — Rotary Startup Award</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
${STYLE}
</head>
<body>
<div class="logo-mark">ROTARY STARTUP AWARD</div>
<div id="counter"></div>
${slides}
${NAV_SCRIPT}
</body>
</html>`;
}
