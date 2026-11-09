/* Aurilia — Firestore classroom XP sync + summons bonus preservation.
   Replace the existing root aurilia-firestore-sync.js with this file. */
import { db, authReady } from './firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const ACTIVE = 'aurilia.campaign.active.v2';
const MODE = 'aurilia.profile.mode.v1:';
const CLASS = 'aurilia.profile.class.v1:';
const PROFILES = 'aurilia.campaign.profiles.v2';
const TRIAL_KEYS = ['game01', 'game02', 'game03', 'game04'];
const LIMITS = { game01: 150, game02: 30, game03: 240, game04: 90 };
const RESET = 'aurilia.competition.reset.v1:';
const BACKUP = 'aurilia.competition.practice.backup.v1:';
const SIX_HOURS = 21600000;
const pending = new Map();
const lastSynced = new Map();
const busy = new Set();

function readProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES) || '{}'); }
  catch (error) { console.error('[Aurilia] Invalid local profiles:', error); return {}; }
}
function capture() {
  const id = localStorage.getItem(ACTIVE);
  if (!id || !/^knight:[0-9a-f-]{36}$/i.test(id)) return null;
  if (localStorage.getItem(MODE + id) !== 'classroom') return null;
  const code = localStorage.getItem(CLASS + id);
  if (!code || !/^AU-[A-HJ-NP-Z2-9]{4}$/.test(code)) return null;
  const profile = readProfiles()[id];
  if (!profile?.playerName) return null;
  const trials = {};
  for (const key of TRIAL_KEYS) {
    const entry = profile.trials?.[key] || {};
    const xp = Number(entry.xp);
    trials[key] = {
      xp: Number.isInteger(xp) ? Math.max(0, Math.min(LIMITS[key], xp)) : 0,
      completed: entry.completed === true
    };
  }
  const summonsBonus = profile.summonsChoice === 'accept' ? 5 : 0;
  const totalXP = summonsBonus + TRIAL_KEYS.reduce((sum, key) => sum + trials[key].xp, 0);
  const rank = window.AuriliaKnight?.getKnightRank(totalXP)?.name || 'Royal Candidate';
  return { id, code, payload: {
    totalXP, rank, completedTrials: TRIAL_KEYS.filter(k => trials[k].completed).length,
    trials, summonsBonus
  }};
}

function backupChoice(current) {
  try {
    const saved = localStorage.getItem(BACKUP + current.code + ':' + current.id);
    return saved ? JSON.parse(saved)?.summonsChoice : null;
  } catch { return null; }
}

function prepareOfficial(current, classroom) {
  const start = classroom.startedAt?.toMillis?.();
  if (classroom.status !== 'active' || !start || Date.now() >= start + SIX_HOURS) return false;
  const suffix = current.code + ':' + current.id;
  const epochKey = RESET + suffix;
  const all = readProfiles();
  const old = all[current.id];
  if (!old) return false;

  if (localStorage.getItem(epochKey) === String(start)) {
    // Repair profiles reset by the previous version, which incorrectly changed
    // an accepted summons to 'refuse'. Only restore from the actual local backup.
    if (old.summonsChoice !== 'accept' && backupChoice(current) === 'accept') {
      window.AuriliaKnight.saveCampaign({
        ...old, summonsChoice: 'accept', summonsBonus: 5
      });
      console.info('[Aurilia] Accepted summons restored from practice backup (+5 XP).');
    }
    return true;
  }

  localStorage.setItem(BACKUP + suffix, JSON.stringify(old));
  const accepted = old.summonsChoice === 'accept';
  const fresh = {
    ...old,
    summonsChoice: old.summonsChoice,
    summonsBonus: accepted ? 5 : 0,
    totalXP: accepted ? 5 : 0,
    trials: Object.fromEntries(TRIAL_KEYS.map(k => [k, { xp: 0, completed: false }]))
  };
  // Set marker before saveCampaign emits a new sync event.
  localStorage.setItem(epochKey, String(start));
  window.AuriliaKnight.saveCampaign(fresh);
  console.info('[Aurilia] Competition started: practice trial XP reset; summons choice preserved.');
  return true;
}

async function flush(key) {
  if (busy.has(key)) return;
  busy.add(key);
  try {
    while (pending.has(key)) {
      const current = pending.get(key);
      pending.delete(key);
      const user = await authReady;
      const ref = doc(db, 'classrooms', current.code, 'knights', current.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.warn('[Aurilia] Knight not registered in Firestore:', current.id);
        continue;
      }
      if (snap.data().ownerUid !== user.uid) {
        console.warn('[Aurilia] Different Firebase account; sync skipped:', current.id);
        continue;
      }
      const classSnap = await getDoc(doc(db, 'classrooms', current.code));
      if (!classSnap.exists()) continue;
      const classroom = classSnap.data();
      if (classroom.status !== 'active' || !classroom.startedAt?.toMillis) continue;
      if (Date.now() >= classroom.startedAt.toMillis() + SIX_HOURS) continue;
      if (!prepareOfficial(current, classroom)) continue;
      if (pending.has(key)) continue;
      const latest = capture();
      if (!latest || latest.id !== current.id || latest.code !== current.code) continue;
      const fingerprint = JSON.stringify(latest.payload);
      if (lastSynced.get(key) === fingerprint) continue;
      await updateDoc(ref, { ...latest.payload, updatedAt: serverTimestamp() });
      lastSynced.set(key, fingerprint);
      console.info('[Aurilia] Official classroom XP synced:', current.id, latest.payload.totalXP, 'XP');
    }
  } catch (error) {
    console.error('[Aurilia] Classroom progress sync failed:', error);
  } finally {
    busy.delete(key);
    if (pending.has(key)) void flush(key);
  }
}

let timer;
function schedule() {
  const current = capture();
  if (!current) return;
  const key = current.code + '/' + current.id;
  pending.set(key, current);
  clearTimeout(timer);
  timer = setTimeout(() => void flush(key), 500);
}
window.addEventListener('aurilia:campaign-saved', schedule);
window.addEventListener('aurilia:player-activated', schedule);
window.addEventListener('pageshow', schedule);
window.addEventListener('focus', schedule);
setInterval(schedule, 12000);
schedule();
