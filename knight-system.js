
/* THE FALLEN KINGDOM — Shared Knight System (multi-player profiles) */
(function () {
  'use strict';
  const CAMPAIGN_KEY = 'aurilia.campaign.v1';
  const PLAYER_NAME_KEY = 'aurilia.player.name.v1';
  const PROFILES_KEY = 'aurilia.campaign.profiles.v2';
  const ACTIVE_KEY = 'aurilia.campaign.active.v2';
  const MAX_XP = 515;
  // ROYAL LEADERBOARD — SHARED 6-HOUR SESSION
  const LEADERBOARD_KEY = 'aurilia.leaderboard.session.v1';
  const LEADERBOARD_DURATION = 6 * 60 * 60 * 1000;
  const TRIAL_LIMITS = {
    game01: 150,
    game02: 30,
    game03: 240,
    game04: 90
  };
  const KNIGHT_RANKS = [
    { name: 'Royal Candidate', minXP: 0, description: 'A new arrival in Aurilia.' },
    { name: 'Royal Initiate', minXP: 20, description: 'Begins to understand the ancient trials.' },
    { name: 'Seal Keeper', minXP: 60, description: 'Has proven the ability to break royal seals.' },
    { name: 'Knight of Aurilia', minXP: 120, description: 'A recognised defender of the fallen kingdom.' },
    { name: 'Royal Guardian', minXP: 220, description: "Trusted with the kingdom's forgotten power." },
    { name: 'Crown Champion', minXP: 350, description: 'Among the strongest champions of the realm.' },
    { name: 'Sovereign of Aurilia', minXP: 450, description: 'The highest rank in Aurilia.' }
  ];
  function clampXP(value, maximum = MAX_XP) {
    const n = Number(value);
    return Number.isFinite(n)
      ? Math.max(0, Math.min(maximum, Math.floor(n)))
      : 0;
  }
  function cleanName(value) {
    if (typeof value !== 'string') return '';
    let name = value.trim();
    for (let i = 0; i < 2; i++) {
      if (name.startsWith('"') && name.endsWith('"')) {
        try {
          const parsed = JSON.parse(name);
          if (typeof parsed === 'string') {
            name = parsed.trim();
            continue;
          }
        } catch (_) {}
      }
      break;
    }
    return name
      .replace(/\\/g, '')
      .replace(/^["']+|["']+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 24);
  }
  function defaultCampaign(name = '') {
    return {
      version: 1,
      playerName: name,
      summonsChoice: null,
      summonsBonus: 0,
      trials: {
        game01: { xp: 0, completed: false },
        game02: { xp: 0, completed: false },
        game03: { xp: 0, completed: false },
        game04: { xp: 0, completed: false }
      },
      totalXP: 0
    };
  }
  function calculateTotal(campaign) {
    return clampXP(
      (campaign.summonsBonus || 0) +
      Object.keys(TRIAL_LIMITS).reduce(
        (sum, key) => sum + (campaign.trials[key]?.xp || 0),
        0
      )
    );
  }
  function normalizeCampaign(saved) {
    const campaign = defaultCampaign();
    if (!saved || typeof saved !== 'object') return campaign;
    campaign.playerName = cleanName(saved.playerName);
    if (
      saved.summonsChoice === 'accept' ||
      saved.summonsChoice === 'refuse'
    ) {
      campaign.summonsChoice = saved.summonsChoice;
    }
    campaign.summonsBonus =
      campaign.summonsChoice === 'accept' ? 5 : 0;
    for (const key of Object.keys(TRIAL_LIMITS)) {
      const old = saved.trials?.[key];
      if (old && typeof old === 'object') {
        campaign.trials[key] = {
          xp: clampXP(old.xp, TRIAL_LIMITS[key]),
          completed: old.completed === true
        };
      }
    }
    campaign.totalXP = calculateTotal(campaign);
    return campaign;
  }
  function profileId(name) {
    return 'name:' + cleanName(name).toLocaleLowerCase();
  }
  function generateKnightId() {
    if (window.crypto && window.crypto.randomUUID) {
      return 'knight:' + window.crypto.randomUUID();
    }
    throw new Error(
      'Secure Knight ID generation is unavailable.'
    );
  }
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  // ==========================================
  // ROYAL LEADERBOARD — SHARED SESSION
  // ==========================================
  function getLeaderboardSession() {
    const now = Date.now();
    const saved = readJSON(LEADERBOARD_KEY, null);
    // Reuse the active session.
    if (
      saved &&
      Number.isFinite(saved.startedAt) &&
      Number.isFinite(saved.endsAt) &&
      saved.endsAt > now &&
      saved.endsAt - saved.startedAt === LEADERBOARD_DURATION
    ) {
      return saved;
    }
    // Start a new session if none exists or
    // the previous six-hour session has expired.
    const session = {
      startedAt: now,
      endsAt: now + LEADERBOARD_DURATION,
      scores: {}
    };
    try {
      localStorage.setItem(
        LEADERBOARD_KEY,
        JSON.stringify(session)
      );
    } catch (error) {
      console.warn(
        "Leaderboard session could not be saved:",
        error
      );
    }
    return session;
  }
  // ==========================================
  // ROYAL LEADERBOARD — LATEST SCORE
  // ==========================================
  function updateLeaderboardScore(campaign) {
    const session = getLeaderboardSession();
    const id = activeId();
    if (!id || !campaign?.playerName || localStorage.getItem('aurilia.profile.mode.v1:' + id) !== 'classroom') {
      return;
    }
    const latestScore = clampXP(campaign.totalXP);
    session.scores[id] = {
      name: campaign.playerName,
      xp: latestScore,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(
        LEADERBOARD_KEY,
        JSON.stringify(session)
      );
    } catch (error) {
      console.warn(
        "Leaderboard score could not be saved:",
        error
      );
    }
  }
  // ==========================================
  // ROYAL LEADERBOARD — RANKING & COUNTDOWN
  // ==========================================
  function getLeaderboardData() {
    const session = getLeaderboardSession();
    const rankings = Object.entries(session.scores || {})
      .filter(([id]) => localStorage.getItem('aurilia.profile.mode.v1:' + id) === 'classroom')
      .map(([, player]) => player)
      .map(player => ({
        name: player.name,
        xp: clampXP(player.xp),
        updatedAt: player.updatedAt
      }))
      .sort((a, b) => {
        // Higher latest XP ranks first.
        if (b.xp !== a.xp) {
          return b.xp - a.xp;
        }
        // Earlier score update wins a tie.
        return a.updatedAt - b.updatedAt;
      })
      .map((player, index) => ({
        position: index + 1,
        ...player
      }));
    return {
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      remainingMs: Math.max(0, session.endsAt - Date.now()),
      rankings
    };
  }
  function getProfiles() {
    const saved = readJSON(PROFILES_KEY, {});
    return saved && typeof saved === 'object' &&
      !Array.isArray(saved) ? saved : {};
  }
  function activeId() {
    try {
      return localStorage.getItem(ACTIVE_KEY) || '';
    } catch (_) {
      return '';
    }
  }
  function persist(profiles, id) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      return true;
    } catch (error) {
      console.warn('Campaign profiles could not be saved.', error);
      return false;
    }
  }
  // Preserve the named player's previous campaign when upgrading.
  function migrateLegacy() {
    const profiles = getProfiles();
    if (Object.keys(profiles).length) return profiles;
    const legacy = readJSON(CAMPAIGN_KEY, null);
    const oldName = cleanName(legacy?.playerName);
    if (!oldName) return profiles;
    const id = profileId(oldName);
    profiles[id] = normalizeCampaign(legacy);
    persist(profiles, id);
    return profiles;
  }
  function loadCampaign() {
    const profiles = migrateLegacy();
    const id = activeId();
    return normalizeCampaign(
      id && profiles[id] ? profiles[id] : null
    );
  }
  function saveCampaign(campaign) {
    const id = activeId();
    if (!id) {
      console.warn('No active player. Campaign not saved.');
      return normalizeCampaign(campaign);
    }
    const profiles = migrateLegacy();
    const normalized = normalizeCampaign(campaign);
    normalized.playerName = cleanName(
      profiles[id]?.playerName || normalized.playerName
    );
    profiles[id] = normalized;
    const saved = persist(profiles, id);
    // Update the Royal Leaderboard with the latest total XP.
    if (saved) {
      updateLeaderboardScore(normalized);
      window.dispatchEvent(
        new CustomEvent("aurilia:campaign-saved")
      );
}
return normalized;
  }
  function activatePlayer(value, options = {}) {
    const name = cleanName(value);
    if (!name) return loadCampaign();
    const anonymous = options.anonymous === true;
    const id = anonymous
      ? 'guest:' + crypto.randomUUID()
      : generateKnightId();
    const profiles = migrateLegacy();
    if (!profiles[id]) {
      profiles[id] = defaultCampaign(name);
    }
    persist(profiles, id);
    window.dispatchEvent(
      new CustomEvent("aurilia:player-activated")
    );
    // Start or join the shared 6-hour leaderboard session.
    getLeaderboardSession();
    try {
      localStorage.setItem(
        PLAYER_NAME_KEY,
        profiles[id].playerName
      );
    } catch (_) {}
    return normalizeCampaign(profiles[id]);
  }
  function savePlayerName(value) {
    return activatePlayer(value);
  }
  function getPlayerName() {
    return loadCampaign().playerName || 'Knight';
  }
  function setSummonsChoice(choice) {
    if (choice !== 'accept' && choice !== 'refuse') {
      return loadCampaign();
    }
    const campaign = loadCampaign();
    if (!activeId()) {
      try {
        localStorage.setItem(
          'aurilia.pending.summons.v2',
          choice
        );
      } catch (_) {}
      return campaign;
    }
    campaign.summonsChoice = choice;
    campaign.summonsBonus = choice === 'accept' ? 5 : 0;
    campaign.totalXP = calculateTotal(campaign);
    return saveCampaign(campaign);
  }
  function recordTrialResult(
    trialKey,
    earnedXP,
    completed = false
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        TRIAL_LIMITS,
        trialKey
      )
    ) {
      return loadCampaign();
    }
    if (!activeId()) {
      console.warn(
        'Select a player in Game 1 before recording XP.'
      );
      return loadCampaign();
    }
    const campaign = loadCampaign();
    const trial = campaign.trials[trialKey];
    const latestXP = clampXP(
      earnedXP,
      TRIAL_LIMITS[trialKey]
    );
    // Latest attempt determines XP.
    // Once completed, the trial remains completed after replay.
    trial.xp = latestXP;
    trial.completed = trial.completed === true || completed === true;
    campaign.totalXP = calculateTotal(campaign);
    return saveCampaign(campaign);
  }
  function getKnightRank(totalXP) {
    const xp = clampXP(totalXP);
    return [...KNIGHT_RANKS]
      .reverse()
      .find(rank => xp >= rank.minXP);
  }
  function isCampaignComplete() {
    return Object.values(loadCampaign().trials)
      .every(trial => trial.completed);
  }
  function checkAndLaunchEpilogue() {
  const campaign = loadCampaign();
  if (!campaign.playerName) return false;
  const allCompleted = Object.values(campaign.trials)
    .every(trial => trial.completed === true);
  if (!allCompleted) return false;
  const epilogueKey =
    'aurilia.epilogue.seen.v1:' +
    (activeId() || profileId(campaign.playerName));
  try {
    if (localStorage.getItem(epilogueKey) === 'true') {
      return false;
    }
    localStorage.setItem(epilogueKey, 'true');
  } catch (error) {
    console.warn('Epilogue status could not be saved:', error);
    return false;
  }
  window.location.href = new URL(
    'games/epilogue.html',
    document.querySelector('script[src$="knight-system.js"]')?.src
  ).href;
  return true;
}
  function getCampaignSummary() {
    const campaign = loadCampaign();
    return {
      ...campaign,
      rank: getKnightRank(campaign.totalXP).name,
      completedTrials: Object.values(campaign.trials)
        .filter(trial => trial.completed).length,
      campaignComplete: Object.values(campaign.trials)
        .every(trial => trial.completed)
    };
  }
  function claimPendingSummons() {
    let choice = null;
    try {
      choice = localStorage.getItem(
        'aurilia.pending.summons.v2'
      );
    } catch (_) {}
    if (choice === 'accept' || choice === 'refuse') {
      setSummonsChoice(choice);
      try {
        localStorage.removeItem(
          'aurilia.pending.summons.v2'
        );
      } catch (_) {}
    }
  }
  window.AuriliaKnight = {
    MAX_XP,
    TRIAL_LIMITS,
    KNIGHT_RANKS,
    cleanName,
    clampXP,
    getKnightRank,
    loadCampaign,
    saveCampaign,
    setSummonsChoice,
    savePlayerName,
    activatePlayer,
    claimPendingSummons,
    getPlayerName,
    recordTrialResult,
    isCampaignComplete,
    checkAndLaunchEpilogue,
    getCampaignSummary,
    getLeaderboardData
  };
  window.KNIGHT_RANKS = KNIGHT_RANKS;
  window.getKnightRank = getKnightRank;
})();

/* Step 12: load classroom sync on every page that uses the shared Knight system. */
(function () {
  const currentScript = [...document.scripts].find(el => /(?:^|\/)knight-system\.js(?:\?|$)/.test(el.src));
  if (!currentScript) return;
  import(new URL('aurilia-firestore-sync.js', currentScript.src).href).catch(error => {
    console.error('[Aurilia] Could not load Firestore progress sync:', error);
  });
})();
