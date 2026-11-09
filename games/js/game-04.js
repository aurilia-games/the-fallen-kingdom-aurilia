
// ============================================================
// THE FALLEN KINGDOM
// TRIAL IV — THE LAST DECREE
// KSSM MATHEMATICS FORM 1 — DSKP 3.1.3
// Relationship between squares and square roots
// ============================================================

import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------

const view = $("game-view");
const startScreen = $("start-screen");
const endScreen = $("end-screen");
const loadingScreen = $("loading-screen");

const questionText = $("question-text");
const questionHint = $("question-hint");
const questionNumber = $("question-number");
const xpValue = $("xp-value");
const livesValue = $("lives-value");
const feedback = $("feedback");
const interactionPrompt = $("interaction-prompt");
const interactionText = $("interaction-text");

const startButton = $("start-button");
const restartButton = $("restart-button");
const soundButton = $("sound-toggle");

const endTitle = $("end-title");
const endDescription = $("end-description");
const finalXP = $("final-xp");
const playerNameLabel = $("player-name");
const restorationSeal = $("restoration-seal");
const endOrnament = $("end-ornament");

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

const TOTAL_QUESTIONS = 9;
const STARTING_LIVES = 5;

const PLAYER_NAME_KEY = "aurilia.player.name.v1";
const GAME1_PROGRESS_KEY = "aurilia.game01.progress.v2";
const GAME1_LEADERBOARD_KEY = "aurilia.game01.leaderboard.v2";
const GAME4_RESULT_KEY = "aurilia.game04.result.v1";

let scene;
let camera;
let renderer;
let clock;
let knight;

let knightParts = {};
let doors = [];
let torches = [];
let dustParticles = [];

let started = false;
let ended = false;
let soundOn = true;
let answerLocked = false;
let audioContext = null;

let xp = 0;
let lives = STARTING_LIVES;
let questionIndex = 0;
let selectedDoor = null;

let animationTime = 0;
let feedbackTimer = null;
let transitionTimer = null;

let playerName = "Royal Candidate";

const keys = {};

const mouse = {
  yaw: 0,
  pitch: -0.035,
  dragging: false,
  lastX: 0,
  lastY: 0,
  doubleDragArmed: false,
  dragDistance: 0
};

const player = {
  x: 0,
  z: 5.2,
  speed: 4.3,
  running: false
};

const ROOM = {
  width: 20,
  depth: 25,
  height: 8
};

// ------------------------------------------------------------
// QUESTION BANK
//
// Important mathematical distinction:
// √n is the principal non-negative square root.
// x² = n has two solutions, +a and -a, for n = a² > 0.
// ------------------------------------------------------------


const questions = [
  {
    prompt: "Given that 4² = 16 and (−4)² = 16, what are the square roots of 16?",
    hint: "Check the square of both +4 and −4.",
    answers: [
      "+4 and −4",
      "+4 only",
      "−4 only"
    ],
    correct: 0,
    explanation:
      "Since 4² = 16 and (−4)² = 16, the square roots of 16 are +4 and −4. The principal square root √16 is 4."
  },
  {
    prompt: "Complete the relationship: 7² = 49 and (−7)² = ____.",
    hint: "A number and its negative have the same square.",
    answers: [
      "−49",
      "49",
      "−7"
    ],
    correct: 1,
    explanation:
      "(−7)² = (−7) × (−7) = 49. Both 7 and −7 have the same square."
  },
  {
    prompt: "Which statement correctly represents the principal square root of 81?",
    hint: "The square root symbol represents the non-negative square root.",
    answers: [
      "√81 = −9",
      "√81 = ±9",
      "√81 = 9"
    ],
    correct: 2,
    explanation:
      "Since 9² = 81, the principal square root is √81 = 9. Both +9 and −9 satisfy x² = 81."
  },
  {
    prompt: "If x² = 100, which values of x satisfy the equation?",
    hint: "Test both the positive and negative forms of 10.",
    answers: [
      "x = +10 or x = −10",
      "x = +10 only",
      "x = −10 only"
    ],
    correct: 0,
    explanation:
      "10² = 100 and (−10)² = 100. Therefore, x = +10 or x = −10."
  },
  {
    prompt: "Compare 6² and (−6)². Which relationship is correct?",
    hint: "Calculate each square separately.",
    answers: [
      "6² > (−6)²",
      "6² = (−6)² = 36",
      "6² < (−6)²"
    ],
    correct: 1,
    explanation:
      "6² = 36 and (−6)² = 36. The square of a number and the square of its negative are equal."
  },
  {
    prompt: "Given that 5² = 25, which statement about the square roots of 25 is correct?",
    hint: "Check which other number has a square of 25.",
    answers: [
      "The square roots are +5 and −4",
      "The only square root is −5",
      "The square roots are +5 and −5"
    ],
    correct: 2,
    explanation:
      "5² = 25 and (−5)² = 25. Therefore, the square roots of 25 are +5 and −5, while √25 = 5."
  },
  {
    prompt: "Which pair of numbers has equal squares?",
    hint: "Compare each positive number with its negative.",
    answers: [
      "+8 and −8",
      "+8 and −7",
      "+8 and +7"
    ],
    correct: 0,
    explanation:
      "8² = 64 and (−8)² = 64. The two numbers have equal squares."
  },
  {
    prompt: "Complete the relationship: 12² = 144, so √144 = ____.",
    hint: "The principal square root is non-negative.",
    answers: [
      "±12",
      "12",
      "−12"
    ],
    correct: 1,
    explanation:
      "Since 12² = 144, the principal square root is √144 = 12. The equation x² = 144 has two solutions: +12 and −12."
  },
  {
    prompt: "Given that (−10)² = 100, which conclusion is correct?",
    hint: "Compare the square of −10 with the square of +10.",
    answers: [
      "10² = −100",
      "10² = 10",
      "10² = (−10)² = 100"
    ],
    correct: 2,
    explanation:
      "10² = 100 and (−10)² = 100. Both numbers have the same square, and the square roots of 100 are +10 and −10."
  }
];


/* ============================================================
   BALANCED ANSWER DISTRIBUTION
   Every door is correct exactly 3 times in 9 questions.
============================================================ */

let activeQuestions = [];
const REALMS = [
  {name:"THE ROYAL HALL",color:0xd6ae68,sky:0x171c2d,accent:0xe5c17d,kind:"hall"},
  {name:"THE ARCANE LIBRARY",color:0x9a8fff,sky:0x11152d,accent:0xaaa2ff,kind:"library"},
  {name:"THE CURSED COURTYARD",color:0x80b7b4,sky:0x0a2025,accent:0x87ded1,kind:"courtyard"},
  {name:"THE CRYSTAL SANCTUARY",color:0x8bdfff,sky:0x0b1a30,accent:0x7fdcff,kind:"crystal"},
  {name:"THE FORGOTTEN FORGE",color:0xff8948,sky:0x29120f,accent:0xffa259,kind:"forge"},
  {name:"THE ABYSSAL CROSSING",color:0x8f83f9,sky:0x111026,accent:0xb2a0ff,kind:"abyss"},
  {name:"THE ASTRAL OBSERVATORY",color:0x85c8ff,sky:0x101a37,accent:0x9ddaff,kind:"observatory"},
  {name:"THE WHISPERING WOODS",color:0x86d98e,sky:0x0b211b,accent:0xa5ecaa,kind:"woods"},
  {name:"THE BETRAYER'S THRONE",color:0xffc36e,sky:0x1b1020,accent:0xffd38d,kind:"throne"}
];
let realmOrder = [], realmObjects = [], realmLights = [], realmTime = 0;
let transitionOverlay, realmLabel, realmTitleTimer;
let realmTransitionTimers = [];
let realmTransitionGeneration = 0;
let epilogueTimer = null;
let ambientTrack;
function makeMusic() {
  ambientTrack = new Audio('../assets/audio/game-04.mp3');
  ambientTrack.loop = true; ambientTrack.volume = 0.14; ambientTrack.preload = 'auto';
  ambientTrack.addEventListener('error',()=>console.info('Optional Game 4 music: place MP3 at assets/audio/game-04.mp3'));
}
function musicPlay() {if(soundOn && ambientTrack) ambientTrack.play().catch(()=>{});}
function musicStop(){if(ambientTrack)ambientTrack.pause();}
function prepareRealms(){
  // Eight discoveries are shuffled; the throne is always the final confrontation.
  realmOrder = [...shuffleArray(REALMS.slice(0,8)), REALMS[8]];
}


function shuffleArray(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function prepareQuestions() {
  // Three correct answers for each of the three doors.
  let doorOrder = shuffleArray([
    0, 0, 0,
    1, 1, 1,
    2, 2, 2
  ]);

  // Avoid making the same door correct consecutively.
  let attempts = 0;

  while (
    doorOrder.some(
      (door, index) =>
        index > 0 && door === doorOrder[index - 1]
    ) &&
    attempts < 100
  ) {
    doorOrder = shuffleArray([
      0, 0, 0,
      1, 1, 1,
      2, 2, 2
    ]);

    attempts++;
  }

  activeQuestions = shuffleArray(questions).map((question, index) => {
    const correctAnswer = question.answers[question.correct];

    const wrongAnswers = question.answers.filter(
      (_, answerIndex) => answerIndex !== question.correct
    );

    const shuffledWrongAnswers = shuffleArray(wrongAnswers);
    const correctDoor = doorOrder[index];

    const answers = [...shuffledWrongAnswers];

    // Place the correct answer at its assigned door.
    answers.splice(correctDoor, 0, correctAnswer);

    return {
      ...question,
      answers,
      correct: correctDoor
    };
  });
}


// ------------------------------------------------------------
// STORAGE AND PLAYER NAME
// ------------------------------------------------------------

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Unable to save game data:", error);
    return false;
  }
}

function cleanName(value) {
  if (typeof value !== "string") return "";

  return value
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 32);
}

function loadPlayerName() {
  const campaign = window.AuriliaKnight?.loadCampaign?.();
  return cleanName(campaign?.playerName || "") || "Royal Candidate";
}

function savePlayerName() {
  // The shared Knight system owns the active player's identity.
  // Do not overwrite it from Game 4.
}

function saveGameResult(completed) {
  const knightSystem = window.AuriliaKnight;
  const activeCampaign = knightSystem?.loadCampaign?.();
  const hasPlayer = Boolean(activeCampaign?.playerName);

  // Player A and Player B each have an independent profile.
  // Latest attempt overwrites only the active player's Game 4 XP.
  if (hasPlayer) {
    knightSystem.recordTrialResult("game04", xp, completed);
  } else {
    console.warn("No active Knight profile: Game 4 XP was not assigned to another player.");
  }

  // Legacy result kept for compatibility, but keyed by profile name.
  if (hasPlayer) {
    const key = "aurilia.game04.latest." +
      activeCampaign.playerName.toLocaleLowerCase();
    safeWrite(key, {
      name: activeCampaign.playerName,
      xp,
      lives,
      completed,
      questionsAnswered: Math.min(questionIndex + (completed ? 0 : 1), TOTAL_QUESTIONS),
      date: new Date().toISOString()
    });
  }
}

// ------------------------------------------------------------
// THREE.JS MATERIALS AND GEOMETRY
// ------------------------------------------------------------

function standardMaterial(
  color,
  roughness = 0.8,
  metalness = 0
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

function addBox(
  parent,
  name,
  size,
  position,
  material,
  rotation = null
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material
  );

  mesh.name = name;
  mesh.position.set(...position);

  if (rotation) mesh.rotation.set(...rotation);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);

  return mesh;
}

function addCylinder(
  parent,
  radiusTop,
  radiusBottom,
  height,
  position,
  material,
  segments = 12
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      segments
    ),
    material
  );

  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);

  return mesh;
}

// ------------------------------------------------------------
// LIGHTING
// ------------------------------------------------------------

function buildLighting() {
  scene.add(
    new THREE.HemisphereLight("#b8c4e0", "#17111a", 1.15)
  );

  const moon = new THREE.DirectionalLight("#c1ceef", 1.7);
  moon.position.set(-5, 11, 6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -14;
  moon.shadow.camera.right = 14;
  moon.shadow.camera.top = 14;
  moon.shadow.camera.bottom = -14;

  scene.add(moon);

  const archiveLight = new THREE.PointLight(
    "#9aa9e8", 45, 25, 2
  );

  archiveLight.position.set(0, 5.4, -10.5);
  scene.add(archiveLight);

  const goldLight = new THREE.PointLight(
    "#d7b578", 27, 18, 2
  );

  goldLight.position.set(0, 4.2, 0);
  scene.add(goldLight);
}

// ------------------------------------------------------------
// ROYAL CHAMBER
// ------------------------------------------------------------

function buildRoom() {
  const stone = standardMaterial("#252a37", 0.92);
  const darkStone = standardMaterial("#141a28", 0.88);
  const floor = standardMaterial("#30313a", 0.84);
  const gold = standardMaterial("#8b744e", 0.55, 0.55);
  const metal = standardMaterial("#202536", 0.42, 0.72);

  addBox(
    scene, "marble-floor",
    [ROOM.width, 0.55, ROOM.depth],
    [0, -0.3, -1.5], floor
  );

  // Floor decoration.
  for (let z = -12; z <= 8; z += 3) {
    addBox(
      scene, "floor-inlay",
      [ROOM.width - 1.2, 0.025, 0.045],
      [0, -0.015, z], gold
    );
  }

  for (let x = -8; x <= 8; x += 4) {
    addBox(
      scene, "floor-joint",
      [0.035, 0.026, ROOM.depth - 1],
      [x, -0.01, -1.5], metal
    );
  }

  // Side walls.
  addBox(
    scene, "left-wall",
    [0.7, ROOM.height, ROOM.depth],
    [-ROOM.width / 2, ROOM.height / 2 - 0.05, -1.5],
    darkStone
  );

  addBox(
    scene, "right-wall",
    [0.7, ROOM.height, ROOM.depth],
    [ROOM.width / 2, ROOM.height / 2 - 0.05, -1.5],
    darkStone
  );

  addBox(
    scene, "rear-wall",
    [ROOM.width, ROOM.height, 0.7],
    [0, ROOM.height / 2 - 0.05, -14],
    darkStone
  );

  // Open central ceiling preserves visibility.
  for (let x = -8; x <= 8; x += 4) {
    addBox(
      scene, "ceiling-beam",
      [0.28, 0.3, ROOM.depth - 1],
      [x, 7.4, -1.5], stone
    );
  }

  // Royal columns.
  for (const side of [-1, 1]) {
    for (let z = -11; z <= 7; z += 6) {
      const x = side * 9.1;

      addBox(
        scene, "royal-column",
        [0.85, 6.8, 0.9],
        [x, 3.4, z], stone
      );

      addBox(
        scene, "column-cap",
        [1.15, 0.24, 1.18],
        [x, 6.85, z], gold
      );

      addBox(
        scene, "column-base",
        [1.16, 0.32, 1.2],
        [x, 0.18, z], metal
      );

      addBox(
        scene, "column-detail",
        [0.92, 0.07, 0.97],
        [x, 5.95, z], gold
      );
    }
  }

  addBox(
    scene, "rear-wall-band",
    [ROOM.width - 1, 0.09, 0.08],
    [0, 6.7, -13.55], gold
  );

  addBox(
    scene, "rear-wall-band",
    [ROOM.width - 1, 0.09, 0.08],
    [0, 1.1, -13.55], gold
  );

  addBox(
    scene, "archive-dais",
    [13, 0.38, 1.7],
    [0, 0.04, -11.3], metal
  );

  addBox(
    scene, "dais-gold-edge",
    [13.1, 0.07, 1.78],
    [0, 0.22, -11.3], gold
  );

  const crest = new THREE.Group();
  crest.position.set(0, 5.1, -13.48);
  scene.add(crest);

  crest.add(
    new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.045, 8, 48),
      gold
    )
  );

  crest.add(
    new THREE.Mesh(
      new THREE.TorusGeometry(0.73, 0.025, 8, 48),
      metal
    )
  );

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.38),
    standardMaterial("#c3a367", 0.32, 0.65)
  );

  diamond.rotation.z = Math.PI / 4;
  diamond.position.z = 0.04;
  crest.add(diamond);
}

// ------------------------------------------------------------
// KNIGHT MODEL
// ------------------------------------------------------------

function buildKnight() {
  knight = new THREE.Group();
  knight.position.set(player.x, 0, player.z);
  scene.add(knight);

  const steel = standardMaterial("#8994a7", 0.32, 0.72);
  const darkSteel = standardMaterial("#394457", 0.4, 0.68);
  const gold = standardMaterial("#c5a367", 0.3, 0.72);
  const cloth = standardMaterial("#17263e", 0.92);
  const leather = standardMaterial("#28232a", 0.85);
  const visor = standardMaterial("#101521", 0.25, 0.8);

  knightParts.body = new THREE.Group();
  knight.add(knightParts.body);

  addBox(
    knightParts.body, "armour-torso",
    [0.72, 0.82, 0.42], [0, 1.45, 0], steel
  );

  addBox(
    knightParts.body, "chest-plate",
    [0.54, 0.45, 0.07], [0, 1.53, 0.235], darkSteel
  );

  const insignia = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13),
    gold
  );

  insignia.position.set(0, 1.57, 0.29);
  knightParts.body.add(insignia);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 10),
      steel
    );

    shoulder.scale.set(1.15, 0.75, 1);
    shoulder.position.set(side * 0.47, 1.77, 0);
    shoulder.castShadow = true;
    knightParts.body.add(shoulder);

    addBox(
      knightParts.body, "shoulder-trim",
      [0.34, 0.055, 0.3],
      [side * 0.47, 1.91, 0.015], gold
    );
  }

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 16, 12),
    steel
  );

  helmet.scale.set(0.91, 1.15, 0.9);
  helmet.position.set(0, 2.2, 0);
  helmet.castShadow = true;
  knightParts.body.add(helmet);

  addBox(
    knightParts.body, "helmet-face",
    [0.32, 0.24, 0.14], [0, 2.15, 0.235], darkSteel
  );

  addBox(
    knightParts.body, "helmet-visor",
    [0.25, 0.035, 0.025], [0, 2.19, 0.314], visor
  );

  addBox(
    knightParts.body, "helmet-crest",
    [0.08, 0.24, 0.08], [0, 2.51, 0], gold
  );

  const cape = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 1.12, 0.09),
    cloth
  );

  cape.position.set(0, 1.28, -0.29);
  cape.rotation.x = -0.08;
  cape.castShadow = true;
  knightParts.body.add(cape);

  addBox(
    knightParts.body, "belt",
    [0.69, 0.13, 0.43], [0, 0.98, 0], leather
  );

  for (const side of [-1, 1]) {
    addBox(
      knightParts.body, "hip-plate",
      [0.31, 0.34, 0.42],
      [side * 0.18, 0.78, 0], darkSteel
    );
  }

  knightParts.legs = [];

  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.19, 0.69, 0);
    knightParts.body.add(leg);

    addBox(
      leg, "armoured-leg",
      [0.25, 0.62, 0.31], [0, -0.29, 0], darkSteel
    );

    addBox(
      leg, "greave",
      [0.27, 0.28, 0.34], [0, -0.34, 0.025], steel
    );

    addBox(
      leg, "boot",
      [0.29, 0.13, 0.42], [0, -0.59, 0.07], leather
    );

    knightParts.legs.push(leg);
  }

  knightParts.arms = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.48, 1.68, 0);
    knightParts.body.add(arm);

    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.14, 0.44, 10),
      darkSteel
    );

    upperArm.position.y = -0.22;
    upperArm.castShadow = true;
    arm.add(upperArm);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 0.38, 10),
      steel
    );

    forearm.position.set(0, -0.55, 0.015);
    forearm.castShadow = true;
    arm.add(forearm);

    const gauntlet = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 10, 8),
      darkSteel
    );

    gauntlet.position.set(0, -0.76, 0.03);
    arm.add(gauntlet);

    knightParts.arms.push(arm);
  }

  const sword = new THREE.Group();
  sword.position.set(-0.52, 1.12, -0.04);
  sword.rotation.z = -0.22;
  knight.add(sword);

  addBox(
    sword, "sword-blade",
    [0.075, 0.88, 0.045], [0, 0.43, 0], steel
  );

  addBox(
    sword, "sword-guard",
    [0.32, 0.075, 0.09], [0, -0.02, 0], gold
  );

  addBox(
    sword, "sword-grip",
    [0.085, 0.25, 0.085], [0, -0.18, 0], leather
  );

  knight.visible = false;
}

// ------------------------------------------------------------
// DOOR SIGN TEXTURES
// ------------------------------------------------------------

function createDoorSignTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;

  return {
    canvas,
    ctx: canvas.getContext("2d")
  };
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (
      ctx.measureText(candidate).width > maxWidth &&
      line
    ) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);

  return lines;
}

function drawDoorSign(door, answer, index, state = "normal") {
  const { canvas, ctx } = door.sign;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#18243a");
  gradient.addColorStop(0.5, "#0b1221");
  gradient.addColorStop(1, "#1c2231");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  let borderColor = "#c2a366";

  if (state === "correct") borderColor = "#b5d2a7";
  if (state === "wrong") borderColor = "#d16b75";

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 7;
  ctx.strokeRect(17, 17, w - 34, h - 34);

  ctx.strokeStyle = "rgba(226, 202, 148, 0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(31, 31, w - 62, h - 62);

  ctx.fillStyle = borderColor;

  for (const x of [48, w - 48]) {
    for (const y of [48, h - 48]) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#d6bd83";
  ctx.font = "600 30px Georgia, serif";

  ctx.fillText(
    `DECREE ${["I", "II", "III"][index]}`,
    w / 2,
    87
  );

  ctx.fillStyle = "rgba(205, 176, 113, 0.55)";
  ctx.fillRect(w / 2 - 82, 132, 164, 2);

  const answerText = String(answer);
  let fontSize = 46;

  ctx.font = `600 ${fontSize}px Arial, sans-serif`;

  let lines = wrapCanvasText(ctx, answerText, w - 86);

  while (
    fontSize > 29 &&
    (lines.length > 3 ||
      lines.some((line) => ctx.measureText(line).width > w - 86))
  ) {
    fontSize -= 3;
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    lines = wrapCanvasText(ctx, answerText, w - 86);
  }

  ctx.fillStyle = "#f2e8d5";

  const lineHeight = fontSize * 1.3;
  const startY = 252 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, startY + i * lineHeight);
  });

  ctx.fillStyle = "#a9a9b3";
  ctx.font = "500 19px Arial, sans-serif";
  ctx.fillText("ROYAL ARCHIVE", w / 2, h - 70);

  door.signTexture.needsUpdate = true;
}

// ------------------------------------------------------------
// DOOR CONSTRUCTION
// ------------------------------------------------------------

function buildDoors() {
  const positions = shuffleArray([-5.1, 0, 5.1]);

  positions.forEach((x, index) => {
    const group = new THREE.Group();
    group.position.set(x, 0, -8.3 + (Math.random() - 0.5) * 1.3);
    scene.add(group);

    const frameMaterial = standardMaterial("#66563f", 0.42, 0.68);
    const doorMaterial = standardMaterial("#171d2b", 0.48, 0.45);
    const insetMaterial = standardMaterial("#242a39", 0.45, 0.42);
    const handleMaterial = standardMaterial("#c6a66b", 0.28, 0.75);

    addBox(
      group, "door-frame-left",
      [0.25, 4.25, 0.48], [-1.12, 2.12, 0], frameMaterial
    );

    addBox(
      group, "door-frame-right",
      [0.25, 4.25, 0.48], [1.12, 2.12, 0], frameMaterial
    );

    addBox(
      group, "door-frame-top",
      [2.48, 0.26, 0.52], [0, 4.15, 0], frameMaterial
    );

    addBox(
      group, "door-frame-base",
      [2.4, 0.18, 0.48], [0, 0.09, 0], frameMaterial
    );

    const leaf = addBox(
      group, "door-leaf",
      [1.94, 3.9, 0.25], [0, 2.05, -0.08], doorMaterial
    );

    for (const side of [-1, 1]) {
      addBox(
        group, "door-inset",
        [0.66, 2.85, 0.035],
        [side * 0.49, 2.02, 0.075], insetMaterial
      );

      addBox(
        group, "door-inset-edge",
        [0.035, 2.9, 0.045],
        [side * 0.85, 2.02, 0.08], frameMaterial
      );
    }

    // No central dividing line on the door leaf.

    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      handleMaterial
    );

    handle.position.set(0.72, 1.35, 0.18);
    group.add(handle);

    const sign = createDoorSignTexture();
    const signTexture = new THREE.CanvasTexture(sign.canvas);

    signTexture.colorSpace = THREE.SRGBColorSpace;
    signTexture.anisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy(),
      4
    );

    const signMaterial = new THREE.MeshBasicMaterial({
      map: signTexture,
      toneMapped: false,
      side: THREE.DoubleSide
    });

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 1.03),
      signMaterial
    );

    signMesh.position.set(0, 2.45, 0.105);
    group.add(signMesh);

    const door = {
      group,
      leaf,
      sign,
      signTexture,
      signMesh,
      x,
      z: group.position.z,
      index,
      answer: "",
      state: "normal",
      opened: false
    };

    drawDoorSign(door, "AWAITING DECREE", index);

    doors.push(door);

    const lamp = new THREE.PointLight("#d7b777", 12, 5, 2);
    lamp.position.set(x, 3.4, -7.6);
    scene.add(lamp);
  });
}

// ------------------------------------------------------------
// TORCHES AND AMBIENT PARTICLES
// ------------------------------------------------------------

function buildDecorations() {
  const metal = standardMaterial("#6f5b3b", 0.4, 0.65);
  const stone = standardMaterial("#333747", 0.86);

  const flameMaterial = new THREE.MeshBasicMaterial({
    color: "#f5bd73"
  });

  for (const side of [-1, 1]) {
    for (let z = -9; z <= 6; z += 5) {
      const x = side * 8.45;

      addBox(
        scene, "torch-base",
        [0.46, 0.5, 0.46], [x, 0.25, z], stone
      );

      addCylinder(
        scene, 0.07, 0.1, 1.5,
        [x, 1.15, z], metal, 10
      );

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        flameMaterial
      );

      flame.scale.set(0.72, 1.55, 0.72);
      flame.position.set(x, 2.05, z);
      scene.add(flame);

      const light = new THREE.PointLight("#f0a96a", 14, 6, 2);
      light.position.set(x, 2.1, z);
      scene.add(light);

      torches.push({
        flame,
        light,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  for (const x of [-6.1, 6.1]) {
    addBox(
      scene, "dais-rail",
      [0.08, 0.7, 1.25],
      [x, 0.56, -11.25], metal
    );
  }
}

function buildAtmosphere() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < 95; i++) {
    positions.push(
      (Math.random() - 0.5) * 18,
      Math.random() * 6.5 + 0.5,
      -13 + Math.random() * 23
    );
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: "#c6ad7a",
    size: 0.035,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  });

  const dust = new THREE.Points(geometry, material);

  scene.add(dust);
  dustParticles.push(dust);
}

// ------------------------------------------------------------
// INITIALISE
// ------------------------------------------------------------

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#090d18");
  scene.fog = new THREE.FogExp2("#0a1020", 0.024);

  camera = new THREE.PerspectiveCamera(
    67,
    Math.max(view.clientWidth, 1) /
      Math.max(view.clientHeight, 1),
    0.1,
    120
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.5)
  );

  renderer.setSize(view.clientWidth, view.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  view.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  buildLighting();
  buildRoom();
  buildKnight();
  buildDoors();
  buildDecorations();
  buildAtmosphere();
  makeMusic();
  prepareRealms();
  setupRealmUI();
  enterRealm(0);

  updateCamera(0);
  updateQuestionUI();

  window.addEventListener("resize", onResize);

  animate();
}

// ------------------------------------------------------------
// HUD AND QUESTIONS
// ------------------------------------------------------------

function updateHUD() {
  xpValue.textContent = String(xp);

  livesValue.textContent = Array.from(
    { length: STARTING_LIVES },
    (_, index) => index < lives ? "♥" : "♡"
  ).join(" ");

  questionNumber.textContent = String(
    Math.min(questionIndex + 1, TOTAL_QUESTIONS)
  );
}

function updateQuestionUI() {
  const question = activeQuestions[questionIndex];

  if (!question) return;

  questionText.textContent = question.prompt;
  questionHint.textContent = question.hint;
  questionNumber.textContent = String(questionIndex + 1);

  doors.forEach((door, index) => {
    door.answer = question.answers[index];
    door.state = "normal";
    door.opened = false;

    door.group.visible = true;
    door.group.rotation.y = 0;

    drawDoorSign(door, door.answer, index);
  });

  selectedDoor = null;
  hideInteraction();
}

// ------------------------------------------------------------
// PLAYER MOVEMENT
// ------------------------------------------------------------

function updatePlayer(delta) {
  if (!started || ended || answerLocked) return;

  const forward = new THREE.Vector3(
    -Math.sin(mouse.yaw), 0, -Math.cos(mouse.yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(mouse.yaw), 0, -Math.sin(mouse.yaw)
  );

  const direction = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp) direction.add(forward);
  if (keys.KeyS || keys.ArrowDown) direction.sub(forward);
  if (keys.KeyD || keys.ArrowRight) direction.add(right);
  if (keys.KeyA || keys.ArrowLeft) direction.sub(right);

  player.running = Boolean(
    keys.ShiftLeft || keys.ShiftRight
  );

  if (direction.lengthSq() > 0) {
    direction.normalize();

    const speed = player.running ? 6.2 : player.speed;

    player.x += direction.x * speed * delta;
    player.z += direction.z * speed * delta;
  }

  player.x = THREE.MathUtils.clamp(player.x, -8.2, 8.2);
  player.z = THREE.MathUtils.clamp(player.z, -12.2, 10.2);

  knight.position.set(player.x, 0, player.z);

  if (direction.lengthSq() > 0) {
    knight.rotation.y = Math.atan2(
      -direction.x,
      -direction.z
    );
  }

  const walking = direction.lengthSq() > 0;

  knightParts.legs.forEach((leg, index) => {
    leg.rotation.x = walking
      ? Math.sin(
          animationTime * 9 + index * Math.PI
        ) * 0.42
      : 0;
  });

  knightParts.arms.forEach((arm, index) => {
    arm.rotation.x = walking
      ? Math.sin(
          animationTime * 9 +
          index * Math.PI +
          Math.PI
        ) * 0.23
      : 0;
  });
}

// ------------------------------------------------------------
// CAMERA
// ------------------------------------------------------------

function updateCamera(delta) {
  if (!camera || !knight) return;

  const desiredPosition = new THREE.Vector3(
    player.x + Math.sin(mouse.yaw) * 4.8,
    3.1,
    player.z + Math.cos(mouse.yaw) * 4.8
  );

  const smoothing =
    1 - Math.exp(-5.5 * Math.max(delta, 0.001));

  camera.position.lerp(desiredPosition, smoothing);

  const lookDirection = new THREE.Vector3(
    -Math.sin(mouse.yaw),
    mouse.pitch,
    -Math.cos(mouse.yaw)
  );

  camera.lookAt(
    player.x + lookDirection.x * 8,
    1.55 + lookDirection.y * 4,
    player.z + lookDirection.z * 8
  );
}

// ------------------------------------------------------------
// DOOR PROXIMITY
// ------------------------------------------------------------

function findNearestDoor() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const door of doors) {
    if (door.opened || !door.group.visible) continue;

    const dx = door.x - player.x;
    const dz = door.z - player.z;
    const distance = Math.hypot(dx, dz);

    if (distance < nearestDistance) {
      nearest = door;
      nearestDistance = distance;
    }
  }

  if (nearest && nearestDistance < 3.4) {
    return { door: nearest, distance: nearestDistance };
  }

  return null;
}

function updateDoorPrompt() {
  if (!started || ended || answerLocked) {
    hideInteraction();
    return;
  }

  const result = findNearestDoor();

  if (!result) {
    selectedDoor = null;
    hideInteraction();
    return;
  }

  selectedDoor = result.door;

  interactionText.textContent =
    `CHOOSE: ${selectedDoor.answer}`;

  interactionPrompt.classList.add("visible");
}

function hideInteraction() {
  interactionPrompt.classList.remove("visible");
}

// ------------------------------------------------------------
// ANSWER SELECTION
// ------------------------------------------------------------

function chooseDoor() {
  if (!started || ended || answerLocked) return;

  const result = findNearestDoor();

  if (!result) {
    showFeedback("MOVE CLOSER TO A DOOR", "");
    return;
  }

  const door = result.door;
  const question = activeQuestions[questionIndex];

  if (!question) return;

  answerLocked = true;
  hideInteraction();

  const isCorrect = door.index === question.correct;

  if (isCorrect) {
    xp += 10;
    door.state = "correct";

    drawDoorSign(
      door, door.answer, door.index, "correct"
    );

    showFeedback("DECREE ACCEPTED · +10 XP", "good");

    playTone(660, 0.12);

    setTimeout(() => {
      if (soundOn && !ended) playTone(880, 0.16);
    }, 100);

    door.opened = true;
    door.leaf.rotation.y = -1.18;
    door.leaf.position.x = -0.85;
    // Enter the selected doorway, then materialize in the next realm.
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      if (ended) return;
      if (questionIndex === TOTAL_QUESTIONS - 1) {
        finishGame(true);
        return;
      }
      showRealmTransition(() => {
        questionIndex++;
        enterRealm(questionIndex);
        answerLocked = false;
        updateHUD();
        updateQuestionUI();
      });
    }, 1150);
  } else {
    xp = Math.max(0, xp - 5);
    lives -= 1;

    door.state = "wrong";

    drawDoorSign(
      door, door.answer, door.index, "wrong"
    );

    showFeedback(
      "DECREE REJECTED · −5 XP · −1 LIFE",
      "bad"
    );

    questionHint.textContent =
      `Correct answer: ${question.answers[question.correct]}. ` +
      question.explanation;

    playRejectSound();
    screenShake();
  }

  updateHUD();

  if (!isCorrect) {
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      if (ended) return;
      if (lives <= 0) { finishGame(false); return; }
      // An incorrect door does not skip the realm or its question.
      answerLocked = false;
      updateQuestionUI();
    }, 1900);
  }
}

// ------------------------------------------------------------
// FEEDBACK AND SCREEN EFFECTS
// ------------------------------------------------------------

function showFeedback(message, kind = "") {
  feedback.textContent = message;
  feedback.className = "feedback show";

  if (kind) feedback.classList.add(kind);

  clearTimeout(feedbackTimer);

  feedbackTimer = setTimeout(() => {
    feedback.classList.remove("show", "good", "bad");
  }, 1650);
}

function screenShake() {
  const shell = $("game-shell");

  if (typeof shell.animate !== "function") return;

  shell.animate(
    [
      { transform: "translate(0, 0)" },
      { transform: "translate(-5px, 2px)" },
      { transform: "translate(4px, -3px)" },
      { transform: "translate(-3px, -2px)" },
      { transform: "translate(0, 0)" }
    ],
    {
      duration: 260,
      easing: "ease-out"
    }
  );
}

// ------------------------------------------------------------
// SOUND
// ------------------------------------------------------------

function playRejectSound() {
  if (!soundOn) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext) audioContext = new AudioContextClass();

    // Same low sawtooth fall effect as Game 1's wrong rune.
    const emit = () => {
      if (!soundOn || audioContext.state !== "running") return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(95, now);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.48);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    };

    if (audioContext.state === "suspended") {
      audioContext.resume().then(emit).catch(error => {
        console.warn("Reject sound could not start:", error);
      });
    } else {
      emit();
    }
  } catch (error) {
    console.warn("Reject sound unavailable:", error);
  }
}

// Call from a real click/keypress to unlock browser audio before gameplay.
function unlockGameAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(error => {
        console.warn("Game audio could not be unlocked:", error);
      });
    }
  } catch (error) {
    console.warn("Audio initialization failed:", error);
  }
}

function playTone(frequency, duration) {
  if (!soundOn) return;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(
      0.0001, audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.12, audioContext.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(
      audioContext.currentTime + duration + 0.03
    );
  } catch (error) {
    console.warn("Audio is unavailable:", error);
  }
}

// ------------------------------------------------------------
// ENDING
// ------------------------------------------------------------

function finishGame(completed) {
  if (ended) return;
  cancelRealmTransition();

  ended = true;
  started = false;
  answerLocked = true;
  clearTimeout(transitionTimer);
  hideInteraction();

  const victory = completed && lives > 0;
  finalXP.textContent = String(xp);
  musicStop();
  endScreen.classList.remove("hidden");
  restorationSeal.classList.add("hidden");

  // Record this trial FIRST, then check the full campaign progress.
  // This supports Game 4 being played first, middle, or last.
  saveGameResult(victory);
  const kingdomRestored = victory &&
    (window.AuriliaKnight?.isCampaignComplete?.() === true);

  const sealHeading = restorationSeal.querySelector("strong");
  const sealSubtitle = restorationSeal.querySelector("span:last-child");

  if (victory) {
    if (kingdomRestored) {
      endTitle.textContent = "AURILIA RESTORED";
      endDescription.textContent =
        `Congratulations, Knight ${playerName}. ` +
        `You have conquered all four royal trials and restored ` +
        `the Fallen Kingdom of Aurilia. Your courage, wisdom, ` +
        `and perseverance have brought light back to the kingdom. ` +
        `Aurilia shall remember your name.`;
      if (sealHeading) sealHeading.textContent = "THE FOUR TRIALS CONQUERED";
      if (sealSubtitle) sealSubtitle.textContent = "THE KINGDOM LIVES AGAIN";
    } else {
      endTitle.textContent = "THE LAST DECREE FULFILLED";
      endDescription.textContent =
        `Congratulations, Knight ${playerName}. ` +
        `You have completed all ${TOTAL_QUESTIONS} royal decrees ` +
        `and earned ${xp} XP. The Royal Archive has been reclaimed, ` +
        `but Aurilia's restoration is not yet complete. ` +
        `Other trials await your courage.`;
      if (sealHeading) sealHeading.textContent = "THE ROYAL ARCHIVE RECLAIMED";
      if (sealSubtitle) sealSubtitle.textContent = "YOUR JOURNEY CONTINUES";
    }
    restorationSeal.classList.remove("hidden");
    endOrnament.textContent = "✦";
    playTone(740, 0.2);
    setTimeout(() => {
      if (soundOn && ended) playTone(980, 0.28);
    }, 160);
  } else {
    endTitle.textContent = "THE DECREE REMAINS";
    endDescription.textContent =
      `Your trial has ended, ${playerName}. ` +
      "The archive remains sealed. Review the relationship " +
      "between square numbers and square roots, then try again.";
    endOrnament.textContent = "◇";
  }

  // Only launch the epilogue when the full campaign is complete.
  if (kingdomRestored) {
    clearTimeout(epilogueTimer);
    epilogueTimer = setTimeout(() => {
      if (ended && window.AuriliaKnight?.isCampaignComplete?.()) {
        window.AuriliaKnight.checkAndLaunchEpilogue?.();
      }
    }, 1000);
  }
}

function resetGame() {
  clearTimeout(epilogueTimer);
  cancelRealmTransition();
  clearTimeout(transitionTimer);
  clearTimeout(feedbackTimer);

  started = false;
  ended = false;
  answerLocked = false;

  xp = 0;
  lives = STARTING_LIVES;
  questionIndex = 0;
  selectedDoor = null;

  player.x = 0;
  player.z = 5.2;
  player.running = false;

  Object.keys(keys).forEach(key => {
    keys[key] = false;
  });

  mouse.dragging = false;
  mouse.doubleDragArmed = false;
  mouse.dragDistance = 0;

  knight.position.set(player.x, 0, player.z);
  knight.rotation.set(0, 0, 0);
  knight.visible = false;

  prepareQuestions();
  prepareRealms();
  enterRealm(0);
  musicStop();
  if (ambientTrack) ambientTrack.currentTime = 0;

  feedback.textContent = "";
  feedback.className = "feedback";

  restorationSeal.classList.add("hidden");

  updateHUD();
  updateQuestionUI();

  endScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

// ------------------------------------------------------------
// KEYBOARD INPUT
// ------------------------------------------------------------

function onKeyDown(event) {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(event.code)) {
    event.preventDefault();
  }

  // ENTER is contextual: start -> choose door -> replay.
  if (event.code === "Enter") {
    if (event.repeat) return;
    if (!startScreen.classList.contains("hidden")) {
      startGame();
    } else if (!endScreen.classList.contains("hidden")) {
      resetGame();
      startGame();
    } else if (started && !ended) {
      chooseDoor();
    }
    return;
  }

  // No buffered movement before the game starts or after it ends.
  if (!started || ended) return;
  keys[event.code] = true;
  if (event.repeat) return;
  if (event.code === "KeyE" || event.code === "Space") chooseDoor();
}

function onKeyUp(event) {
  keys[event.code] = false;
}

// ------------------------------------------------------------
// MOUSE / TOUCHPAD
//
// Standard drag: rotate the camera.
// Double-click then drag: rotate the camera and choose the
// nearest door on release, if the Knight is close enough.
// Keyboard E remains available throughout.
// ------------------------------------------------------------

function onPointerDown(event) {
  if (!started || ended || answerLocked) return;
  if (event.button !== 0) return;

  mouse.dragging = true;
  mouse.lastX = event.clientX;
  mouse.lastY = event.clientY;
  mouse.dragDistance = 0;

  // A double-click arms the special drag interaction.
  mouse.doubleDragArmed = event.detail >= 2;

  try {
    renderer.domElement.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture may not be supported in every browser.
  }
}

function onPointerMove(event) {
  if (!started || ended || !mouse.dragging) return;

  const dx = event.clientX - mouse.lastX;
  const dy = event.clientY - mouse.lastY;

  mouse.lastX = event.clientX;
  mouse.lastY = event.clientY;

  mouse.dragDistance += Math.abs(dx) + Math.abs(dy);

  mouse.yaw -= dx * 0.004;
  mouse.pitch -= dy * 0.0025;

  mouse.pitch = THREE.MathUtils.clamp(
    mouse.pitch, -0.35, 0.22
  );
}

function onPointerUp() {
  if (!mouse.dragging) return;

  const useSpecialDrag =
    mouse.doubleDragArmed && mouse.dragDistance >= 12;

  mouse.dragging = false;
  mouse.doubleDragArmed = false;

  if (useSpecialDrag) {
    chooseDoor();
  }
}

function onResize() {
  if (!camera || !renderer) return;

  const width = Math.max(view.clientWidth, 1);
  const height = Math.max(view.clientHeight, 1);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.5)
  );
}

// ------------------------------------------------------------
// GAME START
// ------------------------------------------------------------

function startGame() {
  unlockGameAudio();
  if (ended) resetGame();

  started = true;
  ended = false;
  answerLocked = false;

  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");

  knight.visible = true;

  updateHUD();
  updateQuestionUI();

  playTone(440, 0.12);
  musicPlay();
}

function toggleSound() {
  unlockGameAudio();
  soundOn = !soundOn;

  soundButton.textContent = soundOn
    ? "♫ SOUND: ON"
    : "♫ SOUND: OFF";

  if (soundOn) { playTone(520, 0.1); musicPlay(); } else musicStop();
}

// ------------------------------------------------------------
// ANIMATION LOOP
// ------------------------------------------------------------

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.035);
  animationTime += delta;

  if (started && !ended) {
    updatePlayer(delta);
    updateDoorPrompt();
  }

  updateCamera(delta);

  for (const torch of torches) {
    const flicker =
      0.88 +
      Math.sin(animationTime * 8 + torch.phase) * 0.09;

    torch.flame.scale.y = 1.55 * flicker;

    torch.light.intensity =
      12 +
      Math.sin(animationTime * 9 + torch.phase) * 2;
  }

  for (const particleSystem of dustParticles) {
    const positions =
      particleSystem.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      positions.array[i * 3 + 1] += delta * 0.035;

      if (positions.array[i * 3 + 1] > 7.2) {
        positions.array[i * 3 + 1] = 0.5;
      }
    }

    positions.needsUpdate = true;
  }

  for (const obj of realmObjects) {
    if (obj.userData.float) {
      obj.position.y = obj.userData.baseY + Math.sin(animationTime*obj.userData.speed+obj.userData.phase)*obj.userData.float;
      obj.rotation.y += delta * 0.13;
    }
  }
  renderer.render(scene, camera);
}

// ------------------------------------------------------------
// BOOT
// ------------------------------------------------------------

// ============================================================
// NINE REALMS — PROCEDURAL ENVIRONMENTS / CINEMATIC TRANSITIONS
// ============================================================
function setupRealmUI() {
  realmLabel = document.createElement('div');
  realmLabel.id = 'realm-label';
  document.getElementById('game-shell').appendChild(realmLabel);
  transitionOverlay = document.createElement('div');
  transitionOverlay.id = 'realm-transition';
  transitionOverlay.innerHTML = '<div class="realm-sigil">✦</div><div class="realm-transition-title"></div><div class="realm-transition-sub">THE NEXT CHAPTER AWAKENS</div>';
  document.getElementById('game-shell').appendChild(transitionOverlay);
}
function clearRealm() {
  realmObjects.forEach(o => {
    scene.remove(o);
    o.traverse(n => { if(n.geometry) n.geometry.dispose(); if(n.material && !Array.isArray(n.material)) n.material.dispose(); });
  });
  realmLights.forEach(l=>scene.remove(l));
  realmObjects=[];realmLights=[];
}
function realmMesh(geometry, material, x,y,z, floating=0) {
  const mesh = new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  if(floating) mesh.userData={float:floating,baseY:y,speed:0.7+Math.random(),phase:Math.random()*6.28};
  scene.add(mesh);realmObjects.push(mesh);return mesh;
}
function realmLight(color,x,y,z,intensity=10,range=9) {
  const l=new THREE.PointLight(color,intensity,range,2);l.position.set(x,y,z);scene.add(l);realmLights.push(l);
}
function enterRealm(index) {
  if(!scene || !renderer) return;
  selectedDoor = null;
  hideInteraction();
  clearRealm();
  const realm=realmOrder[index] || REALMS[0];
  scene.background.setHex(realm.sky);
  scene.fog.color.setHex(realm.sky);
  scene.fog.density=realm.kind==='woods'?.035:.021;
  // Rebuild the three doors in newly randomized physical positions.
  doors.forEach(d=>{
    scene.remove(d.group);
    d.group.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material && !Array.isArray(n.material))n.material.dispose();});
    if(d.signTexture)d.signTexture.dispose();
  });
  doors=[];
  buildDoors();
  const c=realm.color, a=realm.accent;
  const luminous=new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:0.38,roughness:.36,metalness:.3});
  const dark=new THREE.MeshStandardMaterial({color:realm.sky,roughness:.9,metalness:.06});
  const gold=new THREE.MeshStandardMaterial({color:a,metalness:.72,roughness:.25});
  // Portal ring over the central aisle: distinct realm silhouette.
  const torus=realmMesh(new THREE.TorusGeometry(2.5,.07,12,64),gold,0,5.2,-12.9,.07);
  torus.rotation.z=.2;
  realmLight(c,0,5,-9,24,18);
  // Animated stars / magical sparks.
  for(let i=0;i<46;i++){
    const x=(Math.random()-.5)*17,z=-11+Math.random()*20,y=.5+Math.random()*6.3;
    const spark=realmMesh(new THREE.OctahedronGeometry(.025+Math.random()*.06,0),luminous,x,y,z,.12+Math.random()*.25);
    spark.castShadow=false;
  }
  const addCrystal=(x,z,h=2)=>{
    const m=realmMesh(new THREE.OctahedronGeometry(.45,0),luminous,x,h*.5,z,.12);
    m.scale.set(.75,h*1.7,.75);
    const base=realmMesh(new THREE.CylinderGeometry(.55,.72,.28,8),dark,x,.12,z);
    realmLight(c,x,h*.8,z,6,5);
  };
  const addPillar=(x,z,h=4)=>{
    realmMesh(new THREE.CylinderGeometry(.4,.5,h,10),dark,x,h/2,z);
    realmMesh(new THREE.CylinderGeometry(.6,.55,.22,10),gold,x,h+.1,z);
  };
  for(let i=0;i<7;i++){
    const z=-10+i*3.1,side=i%2?1:-1,x=side*(5.7+(i%3)*.7);
    if(realm.kind==='library'){
      realmMesh(new THREE.BoxGeometry(2.2,4.8,.75),dark,x,2.4,z);
      for(let k=0;k<4;k++) realmMesh(new THREE.BoxGeometry(1.8,.07,.9),gold,x,.9+k*.95,z+.06);
      for(let k=0;k<6;k++){
        const book=realmMesh(new THREE.BoxGeometry(.19,.55,.45),new THREE.MeshStandardMaterial({color:[0x74496b,0x4a648e,0x947a4a][k%3]}),x-.7+k*.27,1.25+(i%3)*.05,z+.5,.06);
        book.rotation.y=Math.sin(k)*.15;
      }
    }else if(realm.kind==='crystal'||realm.kind==='abyss'){
      addCrystal(x,z,1.3+i%3*.7);
      if(realm.kind==='abyss'){
        const stone=realmMesh(new THREE.DodecahedronGeometry(.8,0),dark,x,4.8,z,.2);
        stone.rotation.z=i*.4;
      }
    }else if(realm.kind==='woods'){
      realmMesh(new THREE.CylinderGeometry(.25,.45,3.8,9),dark,x,1.9,z);
      for(let k=0;k<3;k++){
        const canopy=realmMesh(new THREE.ConeGeometry(1.4-k*.25,2,8),luminous,x,3.2+k*.9,z,.07);
        canopy.material.emissiveIntensity=.1;
      }
    }else if(realm.kind==='forge'){
      const furnace=realmMesh(new THREE.BoxGeometry(1.6,2.1,1.2),dark,x,1.05,z);
      realmMesh(new THREE.BoxGeometry(.85,.95,.06),luminous,x,1.05,z+.64);
      realmLight(c,x,1.6,z,12,6);
    }else if(realm.kind==='observatory'){
      addPillar(x,z,3.8);
      const orb=realmMesh(new THREE.IcosahedronGeometry(.48,1),luminous,x,4.8,z,.25);
      realmMesh(new THREE.TorusGeometry(.9,.025,8,32),gold,x,4.8,z,.13);
    }else if(realm.kind==='courtyard'){
      const broken=realmMesh(new THREE.CylinderGeometry(.38,.53,1.5+i%3*.8,7),dark,x,1.1,z);
      broken.rotation.z=(i%2?.12:-.12);
      realmMesh(new THREE.DodecahedronGeometry(.5,0),dark,x+.7,.2,z+.3);
    }else{
      addPillar(x,z,3.8+i%3*.4);
      if(realm.kind==='throne'){
        const fire=realmMesh(new THREE.ConeGeometry(.24,.75,8),luminous,x,2.4,z,.15);
        realmLight(c,x,2.3,z,8,5);
      }
    }
  }
  if(realm.kind==='throne'){
    realmMesh(new THREE.BoxGeometry(3,.8,2.4),gold,0,.4,-12);
    realmMesh(new THREE.BoxGeometry(1.8,3,.4),gold,0,2,-12.8);
    realmMesh(new THREE.ConeGeometry(.65,1.1,5),luminous,0,4.1,-12.7,.08);
  }
  // The room itself remains navigable, and the camera/knight retain original controls.
  player.x=0;player.z=5.2;mouse.yaw=0;mouse.pitch=-.035;
  if(knight){knight.position.set(player.x,0,player.z);knight.rotation.y=0;}
  if(realmLabel){
    realmLabel.classList.remove("realm-reveal");
    void realmLabel.offsetWidth;
    realmLabel.classList.add("realm-reveal");
    realmLabel.textContent=`REALM ${index+1} / 9  ✦  ${realm.name}`;
    realmLabel.style.setProperty('--realm-color','#'+c.toString(16).padStart(6,'0'));
  }
  questionHint.textContent=activeQuestions[index]?.hint || '';
}
function cancelRealmTransition(){
  realmTransitionGeneration++;
  realmTransitionTimers.forEach(clearTimeout);
  realmTransitionTimers=[];
  if(transitionOverlay) transitionOverlay.classList.remove('active');
}
function showRealmTransition(callback){
  cancelRealmTransition();
  if(!transitionOverlay){callback();return;}
  const generation=realmTransitionGeneration;
  const next=realmOrder[questionIndex+1];
  transitionOverlay.querySelector('.realm-transition-title').textContent=next?.name||'THE NEXT REALM';
  transitionOverlay.classList.add('active');
  // Swap the entire 3D set behind the portal-style transition.
  realmTransitionTimers.push(setTimeout(()=>{if(!ended && generation===realmTransitionGeneration)callback();},850));
  realmTransitionTimers.push(setTimeout(()=>{if(generation===realmTransitionGeneration)transitionOverlay.classList.remove('active');},1850));
}

async function boot() {
  try {
    playerName = loadPlayerName();

    playerNameLabel.textContent = playerName;

    prepareQuestions();
    initThree();

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    renderer.domElement.addEventListener(
      "pointerdown", onPointerDown
    );

    renderer.domElement.addEventListener(
      "pointermove", onPointerMove
    );

    renderer.domElement.addEventListener(
      "pointerup", onPointerUp
    );

    renderer.domElement.addEventListener(
      "pointercancel", onPointerUp
    );

    window.addEventListener("blur", () => {
      Object.keys(keys).forEach((key) => {
        keys[key] = false;
      });

      mouse.dragging = false;
      mouse.doubleDragArmed = false;
    });

    startButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", resetGame);
    soundButton.addEventListener("click", toggleSound);

    updateHUD();

    requestAnimationFrame(() => {
      loadingScreen.classList.add("done");
    });
  } catch (error) {
    console.error("Unable to start The Last Decree:", error);

    loadingScreen.innerHTML = `
      <div class="screen-card">
        <p class="screen-eyebrow">THE ROYAL ARCHIVE</p>
        <h2>THE CHAMBER COULD NOT OPEN</h2>
        <p class="screen-description">
          Run this game through VS Code Live Server and check
          your internet connection for the Three.js library.
        </p>
        <p class="screen-footnote">
          Open the browser console for technical details.
        </p>
      </div>
    `;
  }
}

boot();
