/* Aurilia Knight Leaderboard — classroom Firestore / solo local leaderboard */
import { db, authReady } from '../../firebase-config.js';
import { doc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const $ = id => document.getElementById(id);
const tbody = $('leaderboard-body');
const clock = $('countdown');
const modeKey = 'aurilia.profile.mode.v1:';
const classKey = 'aurilia.profile.class.v1:';
const activeKey = 'aurilia.campaign.active.v2';
const SIX_HOURS = 6 * 60 * 60 * 1000;
let classroom = null;
let unsubscribeClass = null;
let unsubscribeKnights = null;

function status(message) {
  tbody.replaceChildren();
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 3;
  td.className = 'empty';
  td.textContent = message;
  tr.append(td);
  tbody.append(tr);
}
function addRow(place, name, xp, rank = '') {
  const tr = document.createElement('tr');
  for (const value of [String(place), String(name), `${xp} XP`]) {
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(td);
  }
  if (rank) tr.children[1].title = rank;
  tbody.append(tr);
}
function renderKnights(docs) {
  const data = docs.map(d => ({ id: d.id, ...d.data() }));
  data.sort((a,b) => (Number(b.totalXP)||0)-(Number(a.totalXP)||0) || String(a.playerName||'').localeCompare(String(b.playerName||'')) || a.id.localeCompare(b.id));
  tbody.replaceChildren();
  if (!data.length) { status('No Knights registered in this classroom yet.'); return; }
  data.forEach((entry,i) => addRow(i+1, entry.playerName || 'Unknown Knight', Number(entry.totalXP)||0, entry.rank || ''));
}
function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms/1000));
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return [h,m,sec].map(n => String(n).padStart(2,'0')).join(':');
}
function renderClock() {
  if (!classroom) { clock.textContent = '--:--:--'; return; }
  const start = classroom.startedAt?.toMillis?.();
  if (classroom.status === 'scheduled') {
    clock.textContent = '06:00:00';
  } else if (start) {
    const remaining = start + SIX_HOURS - Date.now();
    clock.textContent = formatTime(remaining);
    if (remaining <= 0 || ['ended','archived'].includes(classroom.status)) clock.textContent = '00:00:00';
  } else {
    clock.textContent = '--:--:--';
  }
}
function solo() {
  clock.textContent = 'PRACTICE';
  // Solo progress lives in local profiles, not in the classroom-only
  // six-hour leaderboard session. Read it directly without changing XP.
  let profiles = {};
  try {
    profiles = JSON.parse(localStorage.getItem('aurilia.campaign.profiles.v2') || '{}');
    if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) profiles = {};
  } catch (error) {
    console.warn('[Aurilia] Unable to read local Solo profiles:', error);
  }
  const rankings = Object.entries(profiles)
    .filter(([id, profile]) =>
      profile && typeof profile.playerName === 'string' && profile.playerName.trim() &&
      !id.startsWith('guest:') &&
      localStorage.getItem(modeKey + id) !== 'classroom'
    )
    .map(([id, profile]) => ({
      id,
      name: profile.playerName.trim(),
      xp: Math.max(0, Math.min(515, Number(profile.totalXP) || 0))
    }))
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  tbody.replaceChildren();
  if (!rankings.length) {
    status('No local Solo leaderboard records yet.');
    return;
  }
  rankings.forEach((entry, index) => addRow(index + 1, entry.name, entry.xp));
}

async function start() {
  const activeId = localStorage.getItem(activeKey);
  const mode = activeId && localStorage.getItem(modeKey + activeId);
  const code = activeId && localStorage.getItem(classKey + activeId);
  if (mode !== 'classroom' || !/^AU-[A-HJ-NP-Z2-9]{4}$/.test(code || '')) {
    solo();
    return;
  }
  status('Connecting to Royal Classroom...');
  try {
    await authReady;
    unsubscribeClass = onSnapshot(doc(db,'classrooms',code), snapshot => {
      if (!snapshot.exists()) { classroom = null; status('Classroom no longer exists.'); renderClock(); return; }
      classroom = snapshot.data();
      renderClock();
    }, error => {
      console.error('[Aurilia] Classroom status error:', error);
      status('Unable to load classroom status.');
    });
    unsubscribeKnights = onSnapshot(collection(db,'classrooms',code,'knights'), snapshot => {
      renderKnights(snapshot.docs);
    }, error => {
      console.error('[Aurilia] Knight leaderboard permission/error:', error);
      status(error.code === 'permission-denied'
        ? 'Class leaderboard access is not enabled for students in Firestore Rules yet.'
        : 'Unable to load Knight rankings. Check your connection.');
    });
  } catch (error) {
    console.error('[Aurilia] Leaderboard initialization failed:', error);
    status('Unable to connect to Firebase.');
  }
}
setInterval(renderClock, 1000);
window.addEventListener('pagehide', () => { unsubscribeClass?.(); unsubscribeKnights?.(); });
void start();
