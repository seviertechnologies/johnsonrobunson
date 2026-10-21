/* Johnson & Robunson — "Case Files" streamer app.
   Works as a website AND inside the Monaca/Cordova wrapper
   (window.APP_API_BASE points at the backend when wrapped).
   Watching is free with no account; an account adds alerts + identity.
   Progress + My List live on-device (localStorage), so they work offline too. */

/* ==================== THE SEASON — edit this table to add episodes ==================== */
var EPISODES = [
  { n: 1, id: 'WPZvBcRLtrs', title: 'Date of Redemption', desc: 'Detective Johnson and Detective R. Robunson are on a stakeout. The two detectives realize they have some common interests and decide to go on a Double Date.' },
  { n: 2, id: 'TQTsqzvgxho', title: "Johnson's Day Off", desc: 'Detective Johnson wakes up excited — he finally gets a day off. Johnson decides today would be a good day for new memories, so he gets up early to attempt a few.' },
  { n: 3, id: 'ft5UlngW7gc', title: 'M. Robunson', desc: 'Detective M. Robunson is transferred to Dago City Police Department. Detective M. Robunson decides the job can wait and goes to the beach for relaxation.' },
  { n: 4, id: '-Kba9SZN_DI', title: 'Redemption', desc: 'Detective Johnson and Detective M Robunson are hanging out before work. While the two detectives are chilling they witness a crime.' },
  { n: 5, id: 'LxELoD3gjM4', title: 'No Butts About It', desc: 'Detective Johnson and Detective M. Robunson are working in the office with fellow officers. Sergeant Thompson arrives and doesn\u2019t like what she sees.' },
  { n: 6, id: 'BcJb8M_oF_c', title: 'Irreconcilable Differences', desc: 'Detective Johnson and Detective Robunson have a love-hate relationship with Detective Rodriguez and Detective Groin.' },
  { n: 7, id: 'JeIsQ3QbmzA', title: 'Target Practice', desc: 'Marco and Locco agree Detective Johnson and Detective Robunson have to go. Marco sends a couple of his boys with Locco to handle his police situation.' },
  { n: 8, id: 'EBB05xqYft0', title: 'Loaded', desc: 'Dago City police department and the Vista Chula police department are working on a drug raid together.' },
  { n: 9, id: 'TAxx4Permng', title: 'Clicked UP!', desc: 'Marco, Locco, Diesel, Milli, Hundred Clip, and Rico meet up. Marco and Locco have a new drug pipeline, and the two need to make sure everyone falls in line.' }
];
var SITE = 'https://www.johnsonandrobunson.com';

/* ==================== helpers / state ==================== */
var $ = function (id) { return document.getElementById(id); };
var API = window.APP_API_BASE || '';
var TOKEN_KEY = 'jr_token';
function buzz() { try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) {} }
function loadJSON(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function progress() { return loadJSON('jr_progress', {}); }
function getProg(id) { return progress()[id] || null; }
function setProg(id, t, d) {
  var p = progress();
  p[id] = { t: Math.round(t), d: Math.round(d), at: Date.now() };
  saveJSON('jr_progress', p);
}
function pctOf(id) { var p = getProg(id); if (!p || !p.d) return 0; return Math.min(100, Math.round((p.t / p.d) * 100)); }
function isFinished(id) { var p = getProg(id); return !!(p && p.d && p.t >= p.d - 15) || pctOf(id) >= 92; }
function myList() { return loadJSON('jr_list', []); }
function inList(id) { return myList().indexOf(id) >= 0; }
function toggleList(id) {
  var l = myList(); var i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else l.push(id);
  saveJSON('jr_list', l); return i < 0;
}
function autoplayOn() { var v = loadJSON('jr_autoplay', true); return v !== false; }
function epById(id) { for (var i = 0; i < EPISODES.length; i++) if (EPISODES[i].id === id) return EPISODES[i]; return null; }
function epByN(n) { for (var i = 0; i < EPISODES.length; i++) if (EPISODES[i].n === n) return EPISODES[i]; return null; }
function thumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

/* ==================== rendering ==================== */
function railCard(ep, showProg) {
  var pct = pctOf(ep.id), fin = isFinished(ep.id);
  var h = '<button class="card" data-play="' + ep.id + '"><span class="thumb"><img loading="lazy" src="' + thumb(ep.id) + '" alt="">'
    + '<span class="stamp-chip disp">Case Nº ' + ep.n + '</span>'
    + (fin ? '<span class="closed-chip disp">Case Closed</span>' : '') + '</span>'
    + '<span class="cap">EP ' + ep.n + ' • ' + esc(ep.title) + '</span>';
  if (showProg && pct > 0 && !fin) h += '<span class="prog"><i style="width:' + pct + '%"></i></span>';
  return h + '</button>';
}
function caseCard(ep) {
  var pct = pctOf(ep.id), fin = isFinished(ep.id), listed = inList(ep.id);
  var btn = fin ? '▶ Watch Again' : (pct > 2 ? '▶ Resume' : '▶ Watch');
  var h = '<div class="case"><div class="cthumb"><img loading="lazy" src="' + thumb(ep.id) + '" alt=""><span class="evid disp">Evidence A</span>'
    + (fin ? '<span class="closed-chip disp">Closed</span>' : '') + '</div>'
    + '<div class="cbody"><h4 class="disp">Case Nº ' + ep.n + '</h4><h5 class="disp">' + esc(ep.title) + '</h5>'
    + '<p>' + esc(ep.desc) + '</p><div class="row">'
    + '<button class="mini-play disp" data-play="' + ep.id + '">' + btn + '</button>'
    + '<button class="mini-list' + (listed ? ' active' : '') + '" data-list="' + ep.id + '" aria-label="Toggle My List">★</button>';
  if (pct > 2 && !fin) h += '<span class="prog mini-prog"><i style="width:' + pct + '%"></i></span>';
  return h + '</div></div></div>';
}
function renderHome() {
  var p = progress();
  var cont = EPISODES.filter(function (ep) { var q = p[ep.id]; return q && !isFinished(ep.id) && pctOf(ep.id) > 2; })
    .sort(function (a, b) { return (p[b.id].at || 0) - (p[a.id].at || 0); });
  $('continue-wrap').hidden = cont.length === 0;
  $('continue-cards').innerHTML = cont.map(function (ep) { return railCard(ep, true); }).join('');
  $('season-cards').innerHTML = EPISODES.map(function (ep) { return railCard(ep, false); }).join('');
  var latest = cont[0];
  $('hero-play').textContent = latest ? '▶ Resume EP ' + latest.n : '▶ Watch EP 1';
  $('hero-play').setAttribute('data-play', latest ? latest.id : EPISODES[0].id);
  var listed = inList(EPISODES[0].id);
  $('hero-list').classList.toggle('active', listed);
  $('hero-list').textContent = listed ? '★ In My List' : '★ My List';
}
function renderCases() { $('case-list').innerHTML = EPISODES.map(caseCard).join(''); }
function renderList() {
  var eps = myList().map(epById).filter(Boolean);
  $('list-wrap').innerHTML = eps.length
    ? eps.map(caseCard).join('')
    : '<div class="empty-note">No cases booked yet.<br>Tap the ★ on any episode to keep it here — your own personal evidence locker.</div>';
}
function renderAll() { renderHome(); renderCases(); renderList(); syncAutoplayUI(); }

/* ==================== navigation ==================== */
function switchView(name) {
  ['home', 'cases', 'list', 'more'].forEach(function (v) { $('view-' + v).hidden = v !== name; });
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-view') === name); });
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tab').forEach(function (t) {
  t.addEventListener('click', function () { buzz(); switchView(t.getAttribute('data-view')); });
});
$('about-cases').addEventListener('click', function () { switchView('cases'); });

/* delegated taps: play buttons + list stars (re-rendered often, so delegate once) */
document.addEventListener('click', function (e) {
  var play = e.target.closest('[data-play]');
  if (play) { buzz(); openPlayer(play.getAttribute('data-play')); return; }
  var star = e.target.closest('[data-list]');
  if (star) { buzz(); toggleList(star.getAttribute('data-list')); renderAll(); }
});
$('hero-list').addEventListener('click', function () { buzz(); toggleList(EPISODES[0].id); renderAll(); });

/* ==================== player (YouTube IFrame API + embed fallback) ==================== */
var ytPlayer = null, ytReady = null, currentEp = null, progTimer = null, fallbackTimer = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(function (resolve, reject) {
    if (window.YT && YT.Player) return resolve();
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) prev(); resolve(); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function () { reject(new Error('yt api failed')); };
    document.head.appendChild(s);
    setTimeout(function () { if (!window.YT || !YT.Player) reject(new Error('yt api timeout')); }, 8000);
  });
  return ytReady;
}
function saveCurrentProgress() {
  if (!currentEp) return;
  try {
    if (ytPlayer && ytPlayer.getCurrentTime) {
      var t = ytPlayer.getCurrentTime(), d = ytPlayer.getDuration();
      if (d > 0) setProg(currentEp.id, t, d);
    }
  } catch (e) {}
}
function startProgTimer() {
  stopProgTimer();
  progTimer = setInterval(function () { saveCurrentProgress(); }, 4000);
}
function stopProgTimer() { if (progTimer) { clearInterval(progTimer); progTimer = null; } }
function onPlayerState(e) {
  if (!currentEp) return;
  if (e.data === YT.PlayerState.ENDED) {
    var d = 0; try { d = ytPlayer.getDuration(); } catch (err) {}
    setProg(currentEp.id, d, d); /* finished */
    stopProgTimer();
    var next = epByN(currentEp.n + 1);
    if (next && autoplayOn()) { setTimeout(function () { openPlayer(next.id); }, 1200); }
    else { renderAll(); }
  }
  if (e.data === YT.PlayerState.PLAYING) startProgTimer();
  if (e.data === YT.PlayerState.PAUSED) { saveCurrentProgress(); renderAll(); }
}
function openPlayer(id) {
  var ep = epById(id); if (!ep) return;
  currentEp = ep;
  var saved = getProg(id);
  var startAt = (saved && !isFinished(id) && saved.t > 5) ? saved.t : 0;
  $('player-case').textContent = 'Case Nº ' + ep.n;
  $('player-meta').textContent = 'Case Nº ' + ep.n + ' • Season One';
  $('player-title').textContent = ep.title;
  $('player-desc').textContent = ep.desc;
  syncPlayerListBtn();
  renderUpNext();
  $('player').hidden = false;
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
  loadYT().then(function () {
    var mount = $('yt-mount');
    if (ytPlayer && ytPlayer.loadVideoById) {
      ytPlayer.loadVideoById({ videoId: id, startSeconds: startAt });
    } else {
      mount.innerHTML = '<div id="yt-slot"></div>';
      ytPlayer = new YT.Player('yt-slot', {
        videoId: id,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, start: startAt },
        events: { onStateChange: onPlayerState }
      });
    }
    startProgTimer();
  }).catch(function () {
    /* Fallback: plain embed (progress tracking unavailable, playback works). */
    $('yt-mount').innerHTML = '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&start=' + startAt + '" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen frameborder="0"></iframe>';
  });
}
function closePlayer() {
  saveCurrentProgress(); stopProgTimer();
  try { if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo(); } catch (e) {}
  $('yt-mount').innerHTML = '<div id="yt-slot"></div>'; ytPlayer = null;
  $('player').hidden = true;
  document.body.style.overflow = '';
  currentEp = null;
  renderAll();
}
$('player-close').addEventListener('click', function () { buzz(); closePlayer(); });
function renderUpNext() {
  var next = currentEp ? epByN(currentEp.n + 1) : null;
  $('upnext-auto').textContent = autoplayOn() ? 'Autoplay On' : 'Autoplay Off';
  $('upnext-slot').innerHTML = next
    ? caseCard(next)
    : '<div class="season-done disp" style="text-transform:none;letter-spacing:0">Season One — case closed. You finished the whole season, detective. ★</div>';
}
function syncPlayerListBtn() {
  if (!currentEp) return;
  var listed = inList(currentEp.id);
  $('player-list-btn').classList.toggle('active', listed);
  $('player-list-btn').textContent = listed ? '★ In My List' : '★ My List';
}
$('player-list-btn').addEventListener('click', function () { if (!currentEp) return; buzz(); toggleList(currentEp.id); syncPlayerListBtn(); renderAll(); });
$('player-share-btn').addEventListener('click', function () {
  if (!currentEp) return; buzz();
  var url = 'https://www.youtube.com/watch?v=' + currentEp.id;
  if (navigator.share) { navigator.share({ title: 'Johnson & Robunson — ' + currentEp.title, url: url }).catch(function () {}); }
  else if (navigator.clipboard) { navigator.clipboard.writeText(url).catch(function () {}); }
});

/* autoplay toggle */
function syncAutoplayUI() { $('autoplay-toggle').classList.toggle('on', autoplayOn()); $('upnext-auto') && ($('upnext-auto').textContent = autoplayOn() ? 'Autoplay On' : 'Autoplay Off'); }
$('autoplay-toggle').addEventListener('click', function () { buzz(); saveJSON('jr_autoplay', !autoplayOn()); syncAutoplayUI(); if (currentEp) renderUpNext(); });

/* ==================== accounts (starter-kit backend) ==================== */
function post(path, body) {
  return fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem(TOKEN_KEY) || '') },
    body: JSON.stringify(body || {})
  }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
}
function setSession(token, name) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (name) localStorage.setItem('jr_name', name);
  refreshAuthUI();
}
function refreshAuthUI() {
  var name = localStorage.getItem('jr_name');
  var logged = !!localStorage.getItem(TOKEN_KEY);
  $('top-user').textContent = logged && name ? name : '';
  $('top-auth-btn').textContent = logged ? 'Sign Out' : 'Sign In';
  $('more-account-state').textContent = logged ? (name || 'Signed in') + ' — tap to sign out' : 'Sign in ›';
}
function openAuth() { $('app').hidden = true; $('auth-view').hidden = false; window.scrollTo(0, 0); }
function closeAuth() { $('auth-view').hidden = true; $('app').hidden = false; }
$('auth-skip').addEventListener('click', function () { closeAuth(); });
$('top-auth-btn').addEventListener('click', function () {
  if (localStorage.getItem(TOKEN_KEY)) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('jr_name'); refreshAuthUI(); }
  else openAuth();
});
$('more-account').addEventListener('click', function () {
  if (localStorage.getItem(TOKEN_KEY)) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('jr_name'); refreshAuthUI(); }
  else openAuth();
});
function showForm(which) {
  ['login-form', 'register-form', 'forgot-form', 'reset-form'].forEach(function (f) { $(f).hidden = f !== which; });
}
$('show-register').addEventListener('click', function (e) { e.preventDefault(); showForm('register-form'); });
$('show-login').addEventListener('click', function (e) { e.preventDefault(); showForm('login-form'); });
$('show-forgot').addEventListener('click', function (e) { e.preventDefault(); showForm('forgot-form'); });
$('fp-back').addEventListener('click', function (e) { e.preventDefault(); showForm('login-form'); });
$('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  post('/api/auth/login', { email: $('li-email').value.trim(), password: $('li-pass').value })
    .then(function (r) {
      if (r.ok && r.d.token) { setSession(r.d.token, r.d.user && r.d.user.name); $('li-msg').textContent = 'Welcome back, detective.'; setTimeout(closeAuth, 500); }
      else $('li-msg').textContent = (r.d && r.d.error) || 'Sign-in failed.';
    }).catch(function () { $('li-msg').textContent = 'Network error — try again.'; });
});
$('register-form').addEventListener('submit', function (e) {
  e.preventDefault();
  post('/api/auth/register', { name: $('rg-name').value.trim(), email: $('rg-email').value.trim(), password: $('rg-pass').value })
    .then(function (r) {
      if (r.ok && r.d.token) { setSession(r.d.token, r.d.user && r.d.user.name); $('rg-msg').textContent = 'Account created — welcome to the squad.'; setTimeout(closeAuth, 500); }
      else $('rg-msg').textContent = (r.d && r.d.error) || 'Registration failed.';
    }).catch(function () { $('rg-msg').textContent = 'Network error — try again.'; });
});
$('forgot-form').addEventListener('submit', function (e) {
  e.preventDefault();
  post('/api/auth/forgot', { email: $('fp-email').value.trim() })
    .then(function (r) { $('fp-msg').textContent = (r.d && r.d.message) || 'Check your email for the code.'; showForm('reset-form'); })
    .catch(function () { $('fp-msg').textContent = 'Network error — try again.'; });
});
$('reset-form').addEventListener('submit', function (e) {
  e.preventDefault();
  post('/api/auth/reset', { email: $('fp-email').value.trim(), code: $('rp-code').value.trim(), password: $('rp-pass').value })
    .then(function (r) {
      if (r.ok && r.d.token) { setSession(r.d.token, r.d.user && r.d.user.name); $('rp-msg').textContent = 'Password updated — you are signed in.'; setTimeout(closeAuth, 600); }
      else $('rp-msg').textContent = (r.d && r.d.error) || 'Reset failed — check the code.';
    }).catch(function () { $('rp-msg').textContent = 'Network error — try again.'; });
});

/* ==================== push (Cordova only; no-op on web) ==================== */
function initPush() {
  document.addEventListener('deviceready', function () {
    try {
      if (!window.PushNotification) return;
      var push = PushNotification.init({
        android: { senderID: null, topics: ['all-listeners'] },
        ios: { alert: true, badge: true, sound: true, topics: ['all-listeners'] }
      });
      push.on('registration', function (data) {
        try {
          fetch(API + '/api/push/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: data.registrationId, platform: (window.device && device.platform) || 'Android' })
          }).catch(function () {});
        } catch (e) {}
      });
      push.on('notification', function () { /* tapped or received — the show speaks for itself */ });
      push.on('error', function () {});
    } catch (e) {}
  }, false);
}

/* ==================== boot ==================== */
function hideSplash() { var s = $('splash'); if (s) { s.classList.add('fade'); setTimeout(function () { s.style.display = 'none'; }, 520); } }
window.addEventListener('load', function () { setTimeout(hideSplash, 2200); });
setTimeout(hideSplash, 5000); /* failsafe */
$('app').hidden = false;
renderAll();
refreshAuthUI();
initPush();
