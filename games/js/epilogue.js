
"use strict";

/* =====================================================
   THE FALLEN KINGDOM — THE KINGDOM REMEMBERS
   Cinematic Epilogue

   - 10 scenes
   - No artificial gates
   - No scrolling
   - New Archivist portrait
   - Clean player names
   - Enter key support
   - No changes to the four trials
===================================================== */

const $ = (id) => document.getElementById(id);

const MAX_XP = 515;

/* =========================================
   ROYAL CAMPAIGN COMPLETION CHECK
========================================= */

const knightSystem = window.AuriliaKnight;

if (!knightSystem || !knightSystem.isCampaignComplete()) {
  alert(
    "The Royal Epilogue is locked. Complete all four royal trials to restore Aurilia."
  );

  window.location.replace("quest.html");

  throw new Error("Royal Epilogue locked: four trials not completed.");
}

const scenes = [
  "arrival",
  "gates",
  "welcome",
  "archivist",
  "prince",
  "seals",
  "ceremony",
  "inscription",
  "restoration",
  "final"
];

const background = $("world-image");
const fade = $("screen-fade");
const soundToggle = $("sound-toggle");

let currentScene = "arrival";
let transitioning = false;
let soundOn = true;
let audioContext = null;

let archivistIndex = 0;
let princeIndex = 0;

/* =====================================================
   STORAGE
===================================================== */

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJSON(key) {
  try {
    const value = readStorage(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function clamp(value, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(max, number));
}

/* =====================================================
   PLAYER NAME FIX
===================================================== */

function cleanKnightName(value) {
  if (typeof value !== "string") {
    return "";
  }

  let name = value.trim();

  // Remove escaped quotes and stray backslashes.
  name = name.replace(/\\+/g, " ");
  name = name.replace(/["'`“”‘’]/g, " ");
  name = name.replace(/\s+/g, " ").trim();

  // Remove titles already included in saved names.
  name = name.replace(/^knight\s+/i, "").trim();

  // Reject empty or symbol-only names.
  if (!name || !/[\p{L}\p{N}]/u.test(name)) {
    return "";
  }

  // Reject names that are mostly punctuation.
  const letters = name.match(/[\p{L}\p{N}]/gu) || [];

  if (letters.length < Math.ceil(name.length * 0.45)) {
    return "";
  }

  return name.slice(0, 30);
}

function getPlayerName() {
  const campaign = readJSON("aurilia.campaign.v1");

  const candidates = [
    campaign?.playerName,
    campaign?.name,
    readStorage("aurilia.player.name.v1"),
    readStorage("auriliaPlayerName"),
    readStorage("playerName")
  ];

  for (const candidate of candidates) {
    const cleaned = cleanKnightName(candidate);

    if (cleaned) {
      return cleaned;
    }
  }

  return "HERO OF AURILIA";
}

/* =====================================================
   XP & RANK
===================================================== */

const ranks = [
  [450, "SOVEREIGN OF AURILIA"],
  [350, "CROWN CHAMPION"],
  [220, "ROYAL GUARDIAN"],
  [120, "KNIGHT OF AURILIA"],
  [60, "SEAL KEEPER"],
  [20, "ROYAL INITIATE"],
  [0, "ROYAL CANDIDATE"]
];

function getRank(xp) {
  for (const [minimum, title] of ranks) {
    if (xp >= minimum) {
      return title;
    }
  }

  return "ROYAL CANDIDATE";
}

function getPlayerData() {
  const knightSystem = window.AuriliaKnight;

  if (!knightSystem) {
    console.error("Aurilia Knight System is unavailable.");

    return {
      name: "HERO OF AURILIA",
      xp: 0,
      rank: "ROYAL CANDIDATE",
      refused: false
    };
  }

  const summary = knightSystem.getCampaignSummary();

  return {
    name: summary.playerName || "HERO OF AURILIA",
    xp: summary.totalXP,
    rank: summary.rank.toUpperCase(),
    refused: summary.summonsChoice === "refuse"
  };
}

const player = getPlayerData();

/* =====================================================
   DIALOGUES
===================================================== */

const archivistLines = [
  player.refused
    ? "You turned away from the summons once. I believed that was the last we would see of you. Yet here you stand."
    : "When you answered the royal summons, I doubted you. To me, you were only a stranger standing before a dying kingdom.",

  "I watched you face the shattered grounds, the lost passage, the stars, and the final decree. With every trial, you restored more than our forgotten knowledge.",

  "I thought only royal blood and mighty armies could save Aurilia. I was wrong. You showed me that courage and wisdom can rise from anyone.",

  `Knight ${player.name}, forgive an old Archivist for failing to see your worth. You gave our people a future when I had nearly lost hope. For that, you have my deepest gratitude.`
];

const princeLines = [
  "The crown has ruled Aurilia for generations. Yet when darkness fell, neither our walls nor our titles could restore what we had lost.",

  "You faced every trial and returned with the knowledge our people had forgotten. Today, this court rises not to command you, but to honour you.",

  `By the authority of the Royal Crown, I honour you, Knight ${player.name}. Let your courage be remembered, and let the future of Aurilia bear witness to your name.`
];

/* =====================================================
   SOUND
===================================================== */

function playTone(frequency, duration = 0.5, delay = 0) {
  if (!soundOn) {
    return;
  }

  try {
    const AudioClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioClass) {
      return;
    }

    if (!audioContext) {
      audioContext = new AudioClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const start = audioContext.currentTime + delay;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      0.025,
      start + 0.05
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  } catch (error) {
    console.warn("Sound unavailable:", error);
  }
}

function chime() {
  playTone(392, 0.7, 0);
  playTone(523.25, 0.9, 0.15);
  playTone(659.25, 1.1, 0.3);
}

function grandChime() {
  playTone(261.63, 1.2, 0);
  playTone(392, 1.4, 0.2);
  playTone(523.25, 1.6, 0.4);
  playTone(783.99, 1.8, 0.6);
}

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;

  soundToggle.textContent = soundOn
    ? "♫ SOUND: ON"
    : "♫ SOUND: OFF";

  if (soundOn) {
    chime();
  }
});

/* =====================================================
   BACKGROUND
===================================================== */

function setBackground(sceneId) {
  const scene = $(sceneId);

  if (!scene) {
    return;
  }

  const filename = scene.dataset.bg;

  if (!filename) {
    return;
  }

  background.style.backgroundImage =
    `url("../assets/${encodeURI(filename)}")`;

  background.classList.remove("camera-enter");

  if (sceneId === "gates") {
    void background.offsetWidth;
    background.classList.add("camera-enter");
  }
}

/* =====================================================
   SCENE TRANSITIONS
===================================================== */

function activateScene(sceneId) {
  scenes.forEach((id) => {
    $(id).classList.toggle("active", id === sceneId);
  });

  currentScene = sceneId;
  setBackground(sceneId);
}

function goTo(sceneId) {
  if (transitioning || !$(sceneId)) {
    return;
  }

  transitioning = true;
  fade.classList.add("visible");

  window.setTimeout(() => {
    activateScene(sceneId);
    fade.classList.remove("visible");

    if (sceneId === "gates") {
      grandChime();

      window.setTimeout(() => {
        if (currentScene === "gates" && !transitioning) {
          goTo("welcome");
        }
      }, 4100);
    } else if (
      sceneId === "restoration" ||
      sceneId === "final"
    ) {
      grandChime();
    } else {
      chime();
    }

    window.setTimeout(() => {
      transitioning = false;
    }, 580);
  }, 580);
}

/* =====================================================
   ARCHIVIST
===================================================== */

function showArchivistLine() {
  $("archivist-dialogue").textContent =
    `“${archivistLines[archivistIndex]}”`;

  $("archivist-progress").textContent =
    `${String(archivistIndex + 1).padStart(2, "0")} / ` +
    `${String(archivistLines.length).padStart(2, "0")}`;

  const last =
    archivistIndex === archivistLines.length - 1;

  $("archivist-next").innerHTML = last
    ? "MEET THE PRINCE <span>✦</span>"
    : "CONTINUE <span>→</span>";
}

function nextArchivist() {
  if (transitioning || currentScene !== "archivist") {
    return;
  }

  if (archivistIndex < archivistLines.length - 1) {
    archivistIndex++;
    showArchivistLine();
    playTone(523.25, 0.2);
  } else {
    princeIndex = 0;
    showPrinceLine();
    goTo("prince");
  }
}

$("archivist-next").addEventListener(
  "click",
  nextArchivist
);

/* =====================================================
   PRINCE
===================================================== */

function showPrinceLine() {
  $("prince-dialogue").textContent =
    `“${princeLines[princeIndex]}”`;

  $("prince-progress").textContent =
    `${String(princeIndex + 1).padStart(2, "0")} / ` +
    `${String(princeLines.length).padStart(2, "0")}`;

  const last =
    princeIndex === princeLines.length - 1;

  $("prince-next").innerHTML = last
    ? "AWAKEN THE FOUR SEALS <span>✦</span>"
    : "CONTINUE <span>→</span>";
}

function nextPrince() {
  if (transitioning || currentScene !== "prince") {
    return;
  }

  if (princeIndex < princeLines.length - 1) {
    princeIndex++;
    showPrinceLine();
    playTone(587.33, 0.2);
  } else {
    goTo("seals");
  }
}

$("prince-next").addEventListener(
  "click",
  nextPrince
);

/* =====================================================
   FINAL PERSONALIZATION
===================================================== */

function updatePersonalization() {
  const knightName = `KNIGHT ${player.name.toUpperCase()}`;

  $("inscription-name").textContent = knightName;
  $("final-knight-name").textContent = knightName;

  $("final-xp").textContent =
    `${player.xp} / ${MAX_XP} XP`;

  $("final-rank").textContent = player.rank;
}

/* =====================================================
   BUTTONS
===================================================== */

document.querySelectorAll("[data-next]").forEach(
  (button) => {
    button.addEventListener("click", () => {
      if (transitioning) {
        return;
      }

      const next = button.dataset.next;

      if (next === "archivist") {
        archivistIndex = 0;
        showArchivistLine();
      }

      if (next === "prince") {
        princeIndex = 0;
        showPrinceLine();
      }

      if (next === "inscription" || next === "final") {
        updatePersonalization();
      }

      goTo(next);
    });
  }
);

/* =====================================================
   ENTER KEY
===================================================== */

document.addEventListener("keydown", (event) => {
  if (
    event.key !== "Enter" ||
    event.repeat ||
    transitioning
  ) {
    return;
  }

  const target = event.target;

  // Avoid double activation on focused buttons.
  if (
    target instanceof HTMLElement &&
    target.closest("button, a, input, textarea, select")
  ) {
    return;
  }

  if (currentScene === "archivist") {
    event.preventDefault();
    nextArchivist();
    return;
  }

  if (currentScene === "prince") {
    event.preventDefault();
    nextPrince();
    return;
  }

  const button = $(currentScene)?.querySelector(
    "[data-next]"
  );

  if (button) {
    event.preventDefault();
    button.click();
  }
});

/* =====================================================
   GOLD DUST
===================================================== */

function createGoldDust() {
  const container = $("gold-dust");

  if (
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    return;
  }

  const count = window.innerWidth < 700 ? 12 : 25;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("span");

    particle.className = "dust";
    particle.style.left = `${Math.random() * 100}%`;

    particle.style.setProperty(
      "--duration",
      `${12 + Math.random() * 15}s`
    );

    particle.style.setProperty(
      "--delay",
      `${-Math.random() * 25}s`
    );

    container.appendChild(particle);
  }
}

/* =====================================================
   INITIALIZE
===================================================== */

function init() {
  // Sound is enabled by default. Browsers may require a user gesture
  // before audio can actually be heard.
  soundToggle.textContent = "♫ SOUND: ON";
  const unlockSound = () => {
    if (!soundOn) return;
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass && !audioContext) audioContext = new AudioClass();
      audioContext?.resume?.().catch(() => {});
    } catch (error) { console.warn("Audio unlock unavailable:", error); }
  };
  document.addEventListener("pointerdown", unlockSound, { once: true });
  document.addEventListener("keydown", unlockSound, { once: true });
  createGoldDust();
  updatePersonalization();
  showArchivistLine();
  showPrinceLine();
  activateScene("arrival");
}

init();
