import * as THREE from "three";

const $ = id => document.getElementById(id);

const ui = {
  canvas: $("world"),
  intro: $("intro-screen"),
  start: $("start-button"),
  welcome: $("welcome-player"),

  mechanism: $("mechanism-panel"),
  mechTitle: $("mechanism-title"),
  clue: $("mechanism-clue"),
  inscription: $("inscription-number"),
  instruction: $("instruction-text"),
  gearRing: $("gear-ring"),
  gearValue: $("gear-value"),
  selected: $("selected-number"),
  down: $("gear-down"),
  up: $("gear-up"),
  engage: $("engage-button"),
  leave: $("leave-button"),
  feedback: $("mechanism-feedback"),

  message: $("message-panel"),
  messageIcon: $("message-icon"),
  messageKicker: $("message-kicker"),
  messageTitle: $("message-title"),
  messageBody: $("message-body"),
  messageClose: $("message-close"),

  ending: $("ending-screen"),
  endingSummary: $("ending-summary"),
  finalXP: $("final-xp"),
  finalTime: $("final-time"),
  returnButton: $("return-button"),

  xp: $("xp-count"),
  seals: $("seal-count"),
  health: $("health-value"),
  timer: $("timer-value"),
  objective: $("objective-text"),
  progress: $("progress-fill"),
  location: $("location-name"),

  prompt: $("interaction-prompt"),
  promptText: $("interaction-text"),
  toast: $("toast"),
  damage: $("damage-flash"),
  sound: $("sound-toggle"),
  minimap: $("minimap")
};

/* =========================================================
   GAME DATA
========================================================= */


const QUESTION_SETS = [
  // MAZE SET 1
  [
    {
      number: 49,
      answer: 7,
      title: "THE WATCHER",
      clue: "The number 49 is carved into this seal. Find the positive number that produces this inscription when multiplied by itself.",
      explanation: "7 × 7 = 49. Therefore, 49 is a perfect square."
    },
    {
      number: 64,
      answer: 8,
      title: "THE HOLLOW KING",
      clue: "The second seal demands precision. Find the positive number whose square is 64.",
      explanation: "8 × 8 = 64. Therefore, 64 is a perfect square."
    },
    {
      number: 81,
      answer: 9,
      title: "THE LAST OATH",
      clue: "The final seal guards the road to the throne. Find the positive number whose square is 81.",
      explanation: "9 × 9 = 81. Therefore, 81 is a perfect square."
    }
  ],

  // MAZE SET 2
  [
    {
      number: 36,
      answer: 6,
      title: "THE WATCHER",
      clue: "An ancient inscription reveals 36. Find the positive whole number that produces 36 when squared.",
      explanation: "6 × 6 = 36. Therefore, 36 is a perfect square."
    },
    {
      number: 100,
      answer: 10,
      title: "THE HOLLOW KING",
      clue: "The royal mechanism displays 100. Determine the positive whole number whose square equals 100.",
      explanation: "10 × 10 = 100. Therefore, 100 is a perfect square."
    },
    {
      number: 121,
      answer: 11,
      title: "THE LAST OATH",
      clue: "The final inscription reads 121. Find the positive whole number that produces this perfect square.",
      explanation: "11 × 11 = 121. Therefore, 121 is a perfect square."
    }
  ],

  // MAZE SET 3
  [
    {
      number: 25,
      answer: 5,
      title: "THE WATCHER",
      clue: "The first seal bears the number 25. Find the positive whole number that produces it when squared.",
      explanation: "5 × 5 = 25. Therefore, 25 is a perfect square."
    },
    {
      number: 144,
      answer: 12,
      title: "THE HOLLOW KING",
      clue: "The second mechanism displays 144. Determine the positive whole number whose square equals 144.",
      explanation: "12 × 12 = 144. Therefore, 144 is a perfect square."
    },
    {
      number: 16,
      answer: 4,
      title: "THE LAST OATH",
      clue: "The final royal seal reveals 16. Find the positive whole number whose square equals 16.",
      explanation: "4 × 4 = 16. Therefore, 16 is a perfect square."
    }
  ]
];

let sealData = QUESTION_SETS[0];

const CELL = 4;
const GRID = 19;
const HALF = Math.floor(GRID / 2);

const LAYOUTS = [
  {
    name: "LAYOUT I · THE FORGOTTEN PASSAGE",
    seed: 2741
  },
  {
    name: "LAYOUT II · THE CROOKED CATACOMBS",
    seed: 8167
  },
  {
    name: "LAYOUT III · THE BETRAYER'S CIRCUIT",
    seed: 4903
  }
];

let layoutIndex = 0;
let mazeSeed = 2741;

const materials = {
  floor: new THREE.MeshStandardMaterial({
    color: 0x182238,
    roughness: 0.92
  }),

  floorAlt: new THREE.MeshStandardMaterial({
    color: 0x202b40,
    roughness: 0.88
  }),

  wall: new THREE.MeshStandardMaterial({
    color: 0x333747,
    roughness: 0.9
  }),

  wallDark: new THREE.MeshStandardMaterial({
    color: 0x101522,
    roughness: 0.95
  }),

  gold: new THREE.MeshStandardMaterial({
    color: 0xc6a05c,
    roughness: 0.34,
    metalness: 0.72
  }),

  steel: new THREE.MeshStandardMaterial({
    color: 0xbfc8d3,
    roughness: 0.3,
    metalness: 0.82
  }),

  steelDark: new THREE.MeshStandardMaterial({
    color: 0x596779,
    roughness: 0.42,
    metalness: 0.75
  }),

  seal: new THREE.MeshStandardMaterial({
    color: 0x8be0ff,
    emissive: 0x176b9c,
    emissiveIntensity: 1.5,
    roughness: 0.24,
    metalness: 0.38
  }),

  red: new THREE.MeshStandardMaterial({
    color: 0xa92c40,
    emissive: 0x4b0611,
    emissiveIntensity: 0.65,
    roughness: 0.48,
    metalness: 0.25
  })
};

let scene;
let camera;
let renderer;
let clock;
let player;
let guardian = null;
let guardianActive = false;
let exitGate = null;

let maze = [];
let walkable = [];
let interactables = [];
let traps = [];
let torches = [];
let walls = [];
let keys = {};

let activeSeal = null;
let gearChoice = 1;

let xp = 0;
let health = 3;
let sealCount = 0;

let gameStarted = false;
let gameEnded = false;
let soundOn = true;

let audioContext = null;

// Background music: resolved relative to games/game-02.html.
const mazeMusic = new Audio("../assets/audio/game-02.mp3");
mazeMusic.loop = true;
mazeMusic.volume = 0.02;
mazeMusic.preload = "auto";

function startMazeMusic() {
  if (!soundOn || !gameStarted || gameEnded) return;
  mazeMusic.play().catch(error => {
    console.warn("Game 2 background music could not play:", error);
  });
}

function stopMazeMusic() {
  mazeMusic.pause();
  mazeMusic.currentTime = 0;
}

let startTime = 0;
let elapsed = 0;
let lastTimerWarning = false;
let timeoutWarningShown = false;

let cameraYaw = 0;
let cameraPitch = 0.68;
let cameraDistance = 7.2;
let draggingCamera = false;
let lastPointerX = 0;
let lastPointerY = 0;

let guardianCooldown = 0;
let toastTimeout = null;
let lastStepSound = 0;
let guardianSpeed = 2.45;
let guardianPath = [];
let guardianPathTimer = 0;
let shadowBetrayer = null;
let shadowPath = [];
let shadowPathTimer = 0;
let shadowCooldown = 0;
let wallTraps = [];
let finalEscapeAnnounced = false;

const moveSpeed = 4.1;
const runSpeed = 6.1;

/* =========================================================
   LAYOUT ROTATION
========================================================= */

function prepareNextLayout() {
  let savedIndex = 0;

  try {
    savedIndex = Number(
      localStorage.getItem("auriliaMazeLayout") || 0
    );
  } catch (error) {
    savedIndex = 0;
  }

  if (!Number.isInteger(savedIndex) || savedIndex < 0) {
    savedIndex = 0;
  }

  layoutIndex = savedIndex % LAYOUTS.length;
  mazeSeed = LAYOUTS[layoutIndex].seed;

  // Select the matching question set for this maze.
  sealData = QUESTION_SETS[layoutIndex];

  try {
    localStorage.setItem(
      "auriliaMazeLayout",
      String((layoutIndex + 1) % LAYOUTS.length)
    );
  } catch (error) {
    console.warn("Maze rotation could not be saved.", error);
  }
}

/* =========================================================
   SEEDED RANDOM GENERATOR
========================================================= */

function createRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (state + 0x6D2B79F5) >>> 0;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

let random = Math.random;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/* =========================================================
   AUDIO
========================================================= */

function playSound(type = "click") {
  if (!soundOn || type === "step") return;

  try {
    audioContext ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    const tone = (
      frequency,
      duration,
      waveform = "sine",
      volume = 0.04,
      delay = 0
    ) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(
        frequency,
        now + delay
      );

      gain.gain.setValueAtTime(volume, now + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + delay + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(now + delay);
      oscillator.stop(now + delay + duration);
    };

    if (type === "click") {
      tone(420, 0.07, "triangle", 0.035);
    }

    if (type === "step") {
      tone(85, 0.045, "triangle", 0.018);
    }

    if (type === "success") {
      tone(523, 0.24, "sine", 0.05);
      tone(659, 0.28, "sine", 0.05, 0.12);
      tone(784, 0.4, "sine", 0.05, 0.24);
    }

    if (type === "wrong") {
      tone(190, 0.35, "sawtooth", 0.055);
      tone(130, 0.45, "sawtooth", 0.05, 0.17);
    }

    if (type === "alarm") {
      [0, 0.2, 0.4, 0.6, 0.8].forEach((delay, i) => {
        tone(i % 2 ? 360 : 520, 0.16, "square", 0.04, delay);
      });
    }

    if (type === "trap") {
      tone(95, 0.3, "sawtooth", 0.06);
      tone(65, 0.42, "triangle", 0.05, 0.12);
    }

    // Guardian collision has its own sound; never use trap audio here.
    if (type === "guardian-hit") {
      tone(155, 0.22, "sawtooth", 0.045);
      tone(115, 0.28, "triangle", 0.035, 0.08);
    }

    if (type === "gate") {
      tone(110, 0.5, "triangle", 0.06);
      tone(220, 0.4, "sine", 0.045, 0.15);
    }

    if (type === "win") {
      [392, 523, 659, 784].forEach((frequency, i) => {
        tone(frequency, 0.55, "sine", 0.045, i * 0.14);
      });
    }
  } catch (error) {
    console.warn("Audio is unavailable:", error);
  }
}

/* =========================================================
   UI HELPERS
========================================================= */

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function showToast(message, danger = false) {
  ui.toast.textContent = message;
  ui.toast.classList.toggle("danger", danger);
  ui.toast.classList.remove("hidden");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    ui.toast.classList.add("hidden");
  }, 2400);
}

function showMessage(
  title,
  body,
  icon = "✦",
  kicker = "ARCHIVE NOTICE"
) {
  ui.messageTitle.textContent = title;
  ui.messageBody.textContent = body;
  ui.messageIcon.textContent = icon;
  ui.messageKicker.textContent = kicker;

  ui.message.classList.remove("hidden");
}

function getPlayerName() {
  const campaignName = window.AuriliaKnight?.getPlayerName();

  if (campaignName) {
    return campaignName.slice(0, 18);
  }

  try {
    return (
      localStorage.getItem("auriliaPlayerName") ||
      "Royal Candidate"
    ).slice(0, 18);
  } catch (error) {
    return "Royal Candidate";
  }
}

function updateHUD() {
  ui.xp.textContent = `${xp} XP`;
  ui.seals.textContent = `${sealCount} / 3`;
  ui.health.textContent = health;
  ui.timer.textContent = formatTime(
  Math.max(0, 180 - elapsed));
  ui.progress.style.width = `${(sealCount / 3) * 100}%`;

  if (sealCount < 3) {
    ui.objective.textContent =
      `Find the ancient seals (${sealCount}/3).`;
  } else {
    ui.objective.textContent =
      "All seals unlocked. Find the exit!";
  }

  ui.location.textContent =
    sealCount >= 3 ? "THE ROYAL EXIT" : "THE SHATTERED ARCHIVE";
}

/* =========================================================
   GRID HELPERS
========================================================= */

function gridToWorld(gx, gz) {
  return new THREE.Vector3(
    (gx - HALF) * CELL,
    0,
    (gz - HALF) * CELL
  );
}

function inGrid(x, z) {
  return x >= 0 && z >= 0 && x < GRID && z < GRID;
}

function isWalk(x, z) {
  return inGrid(x, z) && maze[z][x] === 1;
}

function cellKey(x, z) {
  return `${x},${z}`;
}

/* =========================================================
   MAZE GENERATION
   Each layout has a different seed and corridor pattern.
========================================================= */

function carveMaze() {
  random = createRandom(mazeSeed);

  maze = Array.from(
    { length: GRID },
    () => Array(GRID).fill(0)
  );

  const stack = [[1, 1]];
  maze[1][1] = 1;

  while (stack.length > 0) {
    const [x, z] = stack[stack.length - 1];

    const directions = shuffle([
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2]
    ]);

    let found = false;

    for (const [dx, dz] of directions) {
      const nx = x + dx;
      const nz = z + dz;

      if (
        nx > 0 &&
        nz > 0 &&
        nx < GRID - 1 &&
        nz < GRID - 1 &&
        maze[nz][nx] === 0
      ) {
        maze[z + dz / 2][x + dx / 2] = 1;
        maze[nz][nx] = 1;

        stack.push([nx, nz]);
        found = true;
        break;
      }
    }

    if (!found) {
      stack.pop();
    }
  }

  /*
    Open a layout-specific number of extra corridors.
    The base maze remains connected, while these extra
    passages make each layout feel less predictable.
  */

  const extraPassages = 8 + layoutIndex * 3;
  let opened = 0;
  let attempts = 0;

  while (opened < extraPassages && attempts < 500) {
    attempts++;

    const x = 1 + Math.floor(random() * (GRID - 2));
    const z = 1 + Math.floor(random() * (GRID - 2));

    if (maze[z][x] === 1) continue;

    const horizontal =
      isMazeCellOpen(x - 1, z) &&
      isMazeCellOpen(x + 1, z);

    const vertical =
      isMazeCellOpen(x, z - 1) &&
      isMazeCellOpen(x, z + 1);

    if (horizontal || vertical) {
      maze[z][x] = 1;
      opened++;
    }
  }

  /*
    Guarantee a connected exit route.
    This route changes with the selected layout.
  */

  const exitRoutes = [
    [
      [1, 1], [2, 1], [3, 1], [3, 2],
      [3, 3], [4, 3], [5, 3], [5, 4],
      [5, 5], [6, 5], [7, 5], [7, 6],
      [7, 7], [8, 7], [9, 7], [9, 8],
      [9, 9], [10, 9], [11, 9], [11, 10],
      [11, 11], [12, 11], [13, 11], [13, 12],
      [13, 13], [14, 13], [15, 13], [15, 14],
      [15, 15], [16, 15], [17, 15],
      [17, 16], [17, 17]
    ],
    [
      [1, 1], [1, 2], [1, 3], [2, 3],
      [3, 3], [3, 4], [3, 5], [4, 5],
      [5, 5], [5, 6], [5, 7], [6, 7],
      [7, 7], [7, 8], [7, 9], [8, 9],
      [9, 9], [9, 10], [9, 11], [10, 11],
      [11, 11], [11, 12], [11, 13], [12, 13],
      [13, 13], [13, 14], [13, 15], [14, 15],
      [15, 15], [15, 16], [15, 17],
      [16, 17], [17, 17]
    ],
    [
      [1, 1], [2, 1], [3, 1], [4, 1],
      [5, 1], [5, 2], [5, 3], [4, 3],
      [3, 3], [3, 4], [3, 5], [3, 6],
      [3, 7], [4, 7], [5, 7], [5, 8],
      [5, 9], [6, 9], [7, 9], [7, 10],
      [7, 11], [8, 11], [9, 11], [9, 12],
      [9, 13], [10, 13], [11, 13], [11, 14],
      [11, 15], [12, 15], [13, 15], [13, 16],
      [13, 17], [14, 17], [15, 17],
      [16, 17], [17, 17]
    ]
  ];

  for (const [x, z] of exitRoutes[layoutIndex]) {
    maze[z][x] = 1;
  }

  walkable = [];

  for (let z = 1; z < GRID - 1; z++) {
    for (let x = 1; x < GRID - 1; x++) {
      if (isWalk(x, z)) {
        const position = gridToWorld(x, z);

        walkable.push({
          gx: x,
          gz: z,
          x: position.x,
          z: position.z
        });
      }
    }
  }
}

function isMazeCellOpen(x, z) {
  return inGrid(x, z) && maze[z][x] === 1;
}

/* =========================================================
   BUILDING HELPERS
========================================================= */

function addBox(x, y, z, width, height, depth, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return mesh;
}

function buildFloorAndWalls() {
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const p = gridToWorld(x, z);

      if (isWalk(x, z)) {
        const floor = new THREE.Mesh(
          new THREE.BoxGeometry(CELL - 0.08, 0.2, CELL - 0.08),
          (x + z) % 3 === 0
            ? materials.floorAlt
            : materials.floor
        );

        floor.position.set(p.x, -0.12, p.z);
        floor.receiveShadow = true;
        scene.add(floor);

        if ((x * 3 + z * 5) % 11 === 0) {
          const rune = new THREE.Mesh(
            new THREE.RingGeometry(0.48, 0.54, 4),
            new THREE.MeshBasicMaterial({
              color: 0x6c5835,
              transparent: true,
              opacity: 0.48,
              side: THREE.DoubleSide
            })
          );

          rune.rotation.x = -Math.PI / 2;
          rune.position.set(p.x, -0.005, p.z);
          scene.add(rune);
        }
      } else {
        const adjacent = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ].some(([dx, dz]) => isWalk(x + dx, z + dz));

        if (adjacent) {
          addBox(
            p.x,
            1.65,
            p.z,
            CELL,
            3.3,
            CELL,
            materials.wallDark
          );

          walls.push({
            minX: p.x - CELL / 2,
            maxX: p.x + CELL / 2,
            minZ: p.z - CELL / 2,
            maxZ: p.z + CELL / 2
          });

          addBox(
            p.x,
            3.34,
            p.z,
            CELL + 0.06,
            0.16,
            CELL + 0.06,
            materials.gold
          );

          if ((x + z) % 3 === 0) {
            addBox(
              p.x,
              1.9,
              p.z,
              CELL * 0.93,
              0.045,
              CELL * 0.93,
              materials.steelDark
            );
          }
        }
      }
    }
  }

  for (let i = 0; i < GRID; i++) {
    for (const [x, z] of [
      [i, 0],
      [i, GRID - 1],
      [0, i],
      [GRID - 1, i]
    ]) {
      const p = gridToWorld(x, z);

      addBox(
        p.x, 2, p.z,
        CELL, 4, CELL,
        materials.wallDark
      );

      addBox(
        p.x, 4.05, p.z,
        CELL + 0.1, 0.2, CELL + 0.1,
        materials.gold
      );
    }
  }
}

/* =========================================================
   TORCHES AND ARCHITECTURE
========================================================= */

function createTorch(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.6, 0.18),
    materials.gold
  );

  bracket.position.y = 1.65;
  group.add(bracket);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.22, 0.2, 8),
    materials.steelDark
  );

  bowl.position.y = 2;
  group.add(bowl);

  const flame = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.15, 1),
    new THREE.MeshBasicMaterial({ color: 0xffbd63 })
  );

  flame.position.y = 2.23;
  group.add(flame);

  const light = new THREE.PointLight(0xffa74f, 6, 13, 2);
  light.position.y = 2.3;
  group.add(light);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff9f45,
      transparent: true,
      opacity: 0.08
    })
  );

  halo.position.y = 2.23;
  group.add(halo);

  torches.push({
    group,
    flame,
    light,
    halo,
    phase: random() * 6
  });
}

function createArchitecture() {
  walkable.forEach(cell => {
    if (
      (cell.gx + cell.gz) % 8 === 0 &&
      cell.gx > 2 &&
      cell.gz > 2
    ) {
      createTorch(cell.x, cell.z);
    }
  });

  const start = gridToWorld(1, 1);

  addBox(
    start.x - 1.35, 2, start.z - 1.8,
    0.32, 4, 0.38, materials.gold
  );

  addBox(
    start.x + 1.35, 2, start.z - 1.8,
    0.32, 4, 0.38, materials.gold
  );

  addBox(
    start.x, 3.95, start.z - 1.8,
    3.05, 0.35, 0.4, materials.gold
  );

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.31, 3.4, 8),
      materials.steelDark
    );

    pillar.position.set(
      start.x + side * 1.65,
      1.7,
      start.z - 1.8
    );

    pillar.castShadow = true;
    scene.add(pillar);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.2, 8),
      materials.gold
    );

    cap.position.set(
      start.x + side * 1.65,
      3.35,
      start.z - 1.8
    );

    scene.add(cap);
  }
}

/* =========================================================
   KNIGHT MODEL
========================================================= */

function createKnight(x, z) {
  player = new THREE.Group();
  player.position.set(x, 0, z);
  scene.add(player);

  const armour = materials.steel;
  const darkSteel = materials.steelDark;

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.56, 4, 10),
    armour
  );

  torso.position.y = 1.05;
  torso.castShadow = true;
  player.add(torso);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.53, 0.55, 0.22),
    darkSteel
  );

  chest.position.set(0, 1.12, 0.2);
  chest.castShadow = true;
  player.add(chest);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12),
    armour
  );

  helmet.position.y = 1.78;
  helmet.castShadow = true;
  player.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.09, 0.08),
    materials.wallDark
  );

  visor.position.set(0, 1.77, 0.255);
  player.add(visor);

  const crest = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.32, 0.12),
    materials.gold
  );

  crest.position.set(0, 2.02, 0);
  player.add(crest);

  const armPivots = [];

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 10, 8),
      armour
    );

    shoulder.position.set(side * 0.43, 1.38, 0);
    player.add(shoulder);

    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.43, 1.32, 0);
    player.add(armPivot);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.105, 0.32, 3, 8),
      armour
    );

    upperArm.position.y = -0.2;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 10, 8),
      darkSteel
    );

    elbow.position.y = -0.4;
    armPivot.add(elbow);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.24, 3, 8),
      armour
    );

    forearm.position.y = -0.53;
    armPivot.add(forearm);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 10, 8),
      darkSteel
    );

    hand.position.y = -0.68;
    armPivot.add(hand);

    armPivots.push(armPivot);
  }

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.16, 0.34),
    materials.gold
  );

  belt.position.y = 0.69;
  player.add(belt);

  const legPivots = [];

  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.18, 0.62, 0);
    player.add(legPivot);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.26, 3, 8),
      darkSteel
    );

    thigh.position.y = -0.16;
    legPivot.add(thigh);

    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.24, 3, 8),
      armour
    );

    shin.position.y = -0.42;
    legPivot.add(shin);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.34),
      darkSteel
    );

    boot.position.set(0, -0.58, 0.06);
    legPivot.add(boot);

    legPivots.push(legPivot);
  }

  const sword = new THREE.Group();
  sword.position.set(0.43, 0.57, 0.04);
  sword.rotation.z = -0.15;
  player.add(sword);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.88, 0.035),
    armour
  );

  blade.position.y = -0.45;
  sword.add(blade);

  const bladeEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.84, 0.04),
    materials.gold
  );

  bladeEdge.position.set(0.046, -0.45, 0.008);
  sword.add(bladeEdge);

  const crossGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.08, 0.09),
    materials.gold
  );

  crossGuard.position.y = -0.02;
  sword.add(crossGuard);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.25, 8),
    materials.wallDark
  );

  handle.position.y = 0.14;
  sword.add(handle);

  const pommel = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    materials.gold
  );

  pommel.position.y = 0.28;
  sword.add(pommel);

  const lantern = new THREE.PointLight(0x9dcfff, 0.5, 4);
  lantern.position.set(0, 1.4, 0.5);
  player.add(lantern);

  player.userData.armPivots = armPivots;
  player.userData.legPivots = legPivots;
  player.userData.walkPhase = 0;
}

/* =========================================================
   SEAL CONSOLES
========================================================= */

function createSeal(cell, index) {
  const group = new THREE.Group();
  group.position.set(cell.x, 0, cell.z);
  scene.add(group);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.98, 1.05, 8),
    materials.wallDark
  );

  pedestal.position.y = 0.5;
  pedestal.castShadow = true;
  group.add(pedestal);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.84, 0.84, 0.13, 8),
    materials.gold
  );

  band.position.y = 0.72;
  group.add(band);

  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.57, 0.57, 0.1, 32),
    materials.steelDark
  );

  socket.position.y = 1.06;
  group.add(socket);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.4, 1),
    materials.seal
  );

  crystal.position.y = 1.65;
  crystal.castShadow = true;
  group.add(crystal);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.63, 0.045, 10, 40),
    materials.gold
  );

  ring.position.y = 1.65;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.025, 8, 48),
    new THREE.MeshBasicMaterial({
      color: 0x6bcaff,
      transparent: true,
      opacity: 0.7
    })
  );

  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.06;
  group.add(halo);

  const light = new THREE.PointLight(0x51bfff, 2.2, 9);
  light.position.y = 1.7;
  group.add(light);

  interactables.push({
    type: "seal",
    index,
    group,
    crystal,
    ring,
    halo,
    light,
    cell,
    used: false
  });
}

function distanceBetweenCells(a, b) {
  return Math.hypot(a.gx - b.gx, a.gz - b.gz);
}

function chooseSealCells() {
  const start = { gx: 1, gz: 1 };
  const exit = { gx: 17, gz: 17 };

  const candidates = walkable.filter(cell => {
    return (
      distanceBetweenCells(cell, start) >= 4 &&
      distanceBetweenCells(cell, exit) >= 3 &&
      !(cell.gx === 1 && cell.gz === 1) &&
      !(cell.gx === 17 && cell.gz === 17)
    );
  });

  shuffle(candidates);

  const chosen = [];

  /*
    Spread the seals across the maze instead of placing
    them next to one another.
  */

  for (const candidate of candidates) {
    if (
      chosen.every(
        other => distanceBetweenCells(other, candidate) >= 5
      )
    ) {
      chosen.push(candidate);
    }

    if (chosen.length === 3) break;
  }

  /*
    The maze is connected, so every walkable cell is reachable.
    This fallback handles unusual layouts with fewer candidates.
  */

  if (chosen.length < 3) {
    for (const candidate of candidates) {
      if (!chosen.includes(candidate)) {
        chosen.push(candidate);
      }

      if (chosen.length === 3) break;
    }
  }

  return chosen;
}

/* =========================================================
   TRAPS
========================================================= */

function createTrap(cell) {
  const group = new THREE.Group();
  group.position.set(cell.x, 0, cell.z);
  scene.add(group);

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.1, 2.5),
    materials.wallDark
  );

  plate.position.y = 0.04;
  group.add(plate);

  const warning = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.95, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff3049,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    })
  );

  warning.rotation.x = -Math.PI / 2;
  warning.position.y = 0.11;
  group.add(warning);

  const spikes = [];

  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.55, 5),
        materials.red
      );

      spike.position.set(x * 0.37, -0.22, z * 0.37);
      spike.castShadow = true;
      group.add(spike);
      spikes.push(spike);
    }
  }

  const light = new THREE.PointLight(0xff263d, 0, 5);
  light.position.y = 0.6;
  group.add(light);

  traps.push({
    group,
    warning,
    spikes,
    light,
    state: "idle",
    timer: 3 + random() * 4,
    hit: false
  });
}


/* Wall traps are attached to existing corridor walls, never block a passage. */
function buildWallTraps(sealCells) {
  const excluded = new Set(sealCells.map(c => cellKey(c.gx,c.gz)));
  const candidates = walkable.filter(c =>
    c.gx > 2 && c.gz > 2 && c.gx < 17 && c.gz < 17 &&
    !excluded.has(cellKey(c.gx,c.gz)) &&
    Math.hypot(c.gx-1,c.gz-1)>4 &&
    ((c.gx*7+c.gz*11)%3===0)
  );
  shuffle(candidates);
  let count=0;
  for (const cell of candidates) {
    if (count>=13) break;
    const directions = [
      {dx:-1,dz:0,angle:Math.PI/2},
      {dx:1,dz:0,angle:-Math.PI/2},
      {dx:0,dz:-1,angle:0},
      {dx:0,dz:1,angle:Math.PI}
    ].filter(d=>!isWalk(cell.gx+d.dx,cell.gz+d.dz));
    if (!directions.length) continue;
    const selected=shuffle(directions).slice(0,count%4===0 && directions.length>1?2:1);
    const group=new THREE.Group();
    group.position.set(cell.x,0,cell.z);
    scene.add(group);
    const spikes=[];
    const warnings=[];
    for(const d of selected){
      const wallSide=new THREE.Group();
      wallSide.position.set(d.dx*(CELL/2-0.22),1.12,d.dz*(CELL/2-0.22));
      wallSide.rotation.y=d.angle;
      group.add(wallSide);
      const warning=new THREE.Mesh(
        new THREE.PlaneGeometry(1.9,1.5),
        new THREE.MeshBasicMaterial({color:0xff3049,transparent:true,opacity:0.1,side:THREE.DoubleSide,depthWrite:false})
      );
      warning.position.z=0.035;
      wallSide.add(warning);
      warnings.push(warning);
      for(let ix=-1;ix<=1;ix++) for(let iy=-1;iy<=1;iy++){
        const spike=new THREE.Mesh(new THREE.ConeGeometry(0.19,1.5,6),materials.red);
        spike.rotation.x=Math.PI/2;
        spike.position.set(ix*0.55,iy*0.45,0.25);
        spike.castShadow=true;
        wallSide.add(spike);
        spikes.push({mesh:spike,side:wallSide,extension:0.25});
      }
    }
    const light=new THREE.PointLight(0xff3049,0,5);
    light.position.y=1.4;
    group.add(light);
    wallTraps.push({group,spikes,warnings,light,state:"idle",timer:2+random()*5,hit:false});
    count++;
  }
}
function updateWallTraps(dt){
  if (!player||!gameStarted||gameEnded) return;
  if(!ui.mechanism.classList.contains("hidden")||!ui.message.classList.contains("hidden")) return;
  for(const trap of wallTraps){
    trap.timer-=dt;
    if(trap.state==="idle"&&trap.timer<=0){
      trap.state="warning";trap.timer=1.25;trap.hit=false;
    }else if(trap.state==="warning"){
      const pulse=0.4+0.4*Math.sin(performance.now()*0.025);
      trap.warnings.forEach(w=>w.material.opacity=pulse);
      trap.light.intensity=1.1;
      if(trap.timer<=0){
        trap.state="armed";trap.timer=1.05;
        trap.spikes.forEach(s=>s.mesh.position.z=1.35);
      }
    }else if(trap.state==="armed"){
      const distance=Math.hypot(player.position.x-trap.group.position.x,player.position.z-trap.group.position.z);
      if(distance<1.45&&!trap.hit){
        trap.hit=true;health=Math.max(0,health-1);updateHUD();
        playSound("trap");flashDamage();showToast("WALL SPIKES · -1 HEALTH",true);
        if(health<=0){failGame("health");return;}
      }
      if(trap.timer<=0){
        trap.state="cooldown";trap.timer=2.5;
        trap.spikes.forEach(s=>s.mesh.position.z=0.25);
        trap.warnings.forEach(w=>w.material.opacity=0.1);
        trap.light.intensity=0;
      }
    }else if(trap.state==="cooldown"&&trap.timer<=0){
      trap.state="idle";trap.timer=2.5+random()*4;
    }
  }
}

/* =========================================================
   WORLD SETUP
========================================================= */

function buildWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080d18);
  scene.fog = new THREE.FogExp2(0x080d18, 0.013);

  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    180
  );

  renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;

  scene.add(
    new THREE.HemisphereLight(0x9cb6df, 0x11101a, 1.5)
  );

  const moon = new THREE.DirectionalLight(0x9dbbff, 2.1);
  moon.position.set(-18, 28, -14);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -48;
  moon.shadow.camera.right = 48;
  moon.shadow.camera.top = 48;
  moon.shadow.camera.bottom = -48;
  scene.add(moon);

  const ambient = new THREE.PointLight(0x384f7e, 1.1, 75);
  ambient.position.set(0, 10, 0);
  scene.add(ambient);

  carveMaze();
  buildFloorAndWalls();
  createArchitecture();

  const chosen = chooseSealCells();

  chosen.forEach((cell, index) => {
    createSeal(cell, index);
  });

  const exit = gridToWorld(17, 17);

  exitGate = new THREE.Group();
  exitGate.position.set(exit.x, 0, exit.z);
  scene.add(exitGate);

  const gateFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 3.6, 0.35),
    materials.gold
  );

  gateFrame.position.set(0, 1.8, -1.2);
  exitGate.add(gateFrame);

  const gatePanel = new THREE.Mesh(
    new THREE.BoxGeometry(2.65, 3.0, 0.22),
    materials.wallDark
  );

  gatePanel.position.set(0, 1.5, -1.0);
  exitGate.add(gatePanel);

  const gateSymbol = new THREE.Mesh(
    new THREE.TorusGeometry(0.65, 0.08, 12, 32),
    materials.gold
  );

  gateSymbol.position.set(0, 1.8, -0.84);
  exitGate.add(gateSymbol);

  const gateLight = new THREE.PointLight(0xe8b95d, 1.5, 10);
  gateLight.position.set(0, 2, -0.5);
  exitGate.add(gateLight);

  exitGate.userData.light = gateLight;
  exitGate.userData.symbol = gateSymbol;

  const start = gridToWorld(1, 1);
  createKnight(start.x, start.z);

  const excluded = new Set(
    chosen.map(cell => cellKey(cell.gx, cell.gz))
  );

  const trapCandidates = walkable.filter(cell => {
    return (
      cell.gx > 3 &&
      cell.gz > 3 &&
      (cell.gx + cell.gz) % 5 === 0 &&
      !excluded.has(cellKey(cell.gx, cell.gz)) &&
      Math.hypot(cell.gx - 1, cell.gz - 1) > 3 &&
      Math.hypot(cell.gx - 17, cell.gz - 17) > 2
    );
  });

  shuffle(trapCandidates);
  trapCandidates.slice(0, 11).forEach(createTrap);
  buildWallTraps(chosen);

  const layoutLabel = LAYOUTS[layoutIndex].name;
  console.info(`Aurilia maze loaded: ${layoutLabel}`);
}

/* =========================================================
   MOVEMENT AND COLLISION
========================================================= */

function isBlocked(x, z, radius = 0.38) {
  const samples = [
    [x - radius, z - radius],
    [x + radius, z - radius],
    [x - radius, z + radius],
    [x + radius, z + radius]
  ];

  return samples.some(([sx, sz]) => {
    const gx = Math.round(sx / CELL + HALF);
    const gz = Math.round(sz / CELL + HALF);

    return !isWalk(gx, gz);
  });
}

function nearbySeal() {
  if (!player) return null;

  let best = null;
  let bestDistance = 2.8;

  for (const item of interactables) {
    if (item.used) continue;

    const distance = Math.hypot(
      player.position.x - item.group.position.x,
      player.position.z - item.group.position.z
    );

    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }

  return best;
}

function animateKnight(dt, moving) {
  if (!player) return;

  if (moving) {
    player.userData.walkPhase += dt * 10;
  }

  const wave = Math.sin(player.userData.walkPhase);

  player.userData.legPivots.forEach((pivot, index) => {
    pivot.rotation.x = moving
      ? wave * (index === 0 ? 0.48 : -0.48)
      : THREE.MathUtils.damp(pivot.rotation.x, 0, 8, dt);
  });

  player.userData.armPivots.forEach((pivot, index) => {
    pivot.rotation.x = moving
      ? wave * (index === 0 ? -0.3 : 0.3)
      : THREE.MathUtils.damp(pivot.rotation.x, 0, 8, dt);
  });
}

function movePlayer(dt) {
  if (
    !player ||
    !gameStarted ||
    gameEnded ||
    !ui.mechanism.classList.contains("hidden") ||
    !ui.message.classList.contains("hidden")
  ) {
    animateKnight(dt, false);
    return;
  }

  const forwardInput =
    (keys.KeyW || keys.ArrowUp ? 1 : 0) -
    (keys.KeyS || keys.ArrowDown ? 1 : 0);

  const sideInput =
    (keys.KeyD || keys.ArrowRight ? 1 : 0) -
    (keys.KeyA || keys.ArrowLeft ? 1 : 0);

  const length = Math.hypot(forwardInput, sideInput);

  if (length === 0) {
    animateKnight(dt, false);
    return;
  }

  const forward = new THREE.Vector3(
    -Math.sin(cameraYaw),
    0,
    -Math.cos(cameraYaw)
  );

  const right = new THREE.Vector3(
    Math.cos(cameraYaw),
    0,
    -Math.sin(cameraYaw)
  );

  const direction = new THREE.Vector3();

  direction.addScaledVector(forward, forwardInput / length);
  direction.addScaledVector(right, sideInput / length);
  direction.normalize();

  const running = keys.ShiftLeft || keys.ShiftRight;
  const speed = running ? runSpeed : moveSpeed;

  const dx = direction.x * speed * dt;
  const dz = direction.z * speed * dt;

  const nextX = player.position.x + dx;

  if (!isBlocked(nextX, player.position.z)) {
    player.position.x = nextX;
  }

  const nextZ = player.position.z + dz;

  if (!isBlocked(player.position.x, nextZ)) {
    player.position.z = nextZ;
  }

  player.rotation.y = Math.atan2(direction.x, direction.z);
  animateKnight(dt, true);

  const now = performance.now();

  if (now - lastStepSound > 320) {
    // Footstep sound disabled; walking animation stays active.
    lastStepSound = now;
  }
}

/* =========================================================
   CAMERA
========================================================= */

function updateCamera(dt) {
  if (!player) return;

  const horizontalDistance =
    Math.cos(cameraPitch) * cameraDistance;

  const verticalDistance =
    Math.sin(cameraPitch) * cameraDistance;

  const targetPosition = new THREE.Vector3(
    player.position.x + Math.sin(cameraYaw) * horizontalDistance,
    player.position.y + 1.35 + verticalDistance,
    player.position.z + Math.cos(cameraYaw) * horizontalDistance
  );

  camera.position.lerp(
    targetPosition,
    1 - Math.exp(-7 * dt)
  );

  camera.lookAt(
    player.position.x,
    player.position.y + 1.05,
    player.position.z
  );
}

function setupCameraControls() {
  ui.canvas.addEventListener("pointerdown", event => {
    if (
      !gameStarted ||
      !ui.mechanism.classList.contains("hidden") ||
      !ui.message.classList.contains("hidden") ||
      event.button !== 0
    ) {
      return;
    }

    draggingCamera = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    ui.canvas.setPointerCapture(event.pointerId);
  });

  ui.canvas.addEventListener("pointermove", event => {
    if (!draggingCamera) return;

    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;

    cameraYaw -= dx * 0.005;

    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch + dy * 0.003,
      0.22,
      1.05
    );

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  });

  const stopDragging = () => {
    draggingCamera = false;
  };

  ui.canvas.addEventListener("pointerup", stopDragging);
  ui.canvas.addEventListener("pointercancel", stopDragging);
  ui.canvas.addEventListener("lostpointercapture", stopDragging);

  ui.canvas.addEventListener("wheel", event => {
    if (!gameStarted) return;

    cameraDistance = THREE.MathUtils.clamp(
      cameraDistance + event.deltaY * 0.008,
      4.8,
      10.5
    );
  }, { passive: true });
}

/* =========================================================
   SEAL MECHANISM
========================================================= */

function openMechanism(item) {
  if (!item || item.used) return;

  activeSeal = item;
  gearChoice = 1;

  const data = sealData[item.index];

  ui.mechTitle.textContent = data.title;
  ui.clue.textContent = data.clue;
  ui.inscription.textContent = data.number;

  ui.gearValue.textContent = gearChoice;
  ui.selected.textContent = gearChoice;
  ui.gearRing.style.transform = "rotate(0deg)";

  ui.instruction.textContent =
    "Rotate the ring until your selected number matches the seal inscription.";

  ui.feedback.className = "mechanism-feedback";
  ui.feedback.textContent =
    "The answer will not be revealed. Choose your number carefully.";

  ui.mechanism.classList.remove("hidden");
  ui.prompt.classList.add("hidden");

  playSound("click");
}

function updateGear(delta) {
  if (!activeSeal) return;

  gearChoice += delta;

  if (gearChoice > 12) gearChoice = 1;
  if (gearChoice < 1) gearChoice = 12;

  const degrees = (gearChoice - 1) * 30;

  ui.gearRing.style.transform = `rotate(${-degrees}deg)`;
  ui.gearValue.textContent = gearChoice;
  ui.selected.textContent = gearChoice;

  ui.feedback.className = "mechanism-feedback";
  ui.feedback.textContent =
    "The ring has turned. Decide whether your selected number is correct.";

  playSound("click");
}

function closeMechanism() {
  ui.mechanism.classList.add("hidden");
  activeSeal = null;
}

function flashDamage() {
  ui.damage.style.opacity = "1";

  setTimeout(() => {
    ui.damage.style.opacity = "0";
  }, 280);
}

function wrongAnswer() {
  if (!activeSeal) return;

  health = Math.max(0, health - 1);
  xp = Math.max(0, xp - 5);

  updateHUD();

  ui.feedback.className = "mechanism-feedback bad";
  ui.feedback.textContent =
    "Incorrect selection. The alarm has been triggered!";

  flashDamage();
  playSound("wrong");

  setTimeout(() => {
    playSound("alarm");
  }, 180);

  spawnGuardian();

  showToast("ALARM TRIGGERED · THE GUARDIAN IS HUNTING YOU!", true);

  if (health <= 0) {
    failGame("health");
    return;
  }
}

function confirmGear() {
  if (!activeSeal) return;

  const data = sealData[activeSeal.index];

  if (gearChoice !== data.answer) {
    wrongAnswer();
    return;
  }

  activeSeal.used = true;
  activeSeal.crystal.material = materials.gold;
  activeSeal.light.color.setHex(0xffce70);
  activeSeal.halo.material.color.setHex(0xffd77d);

  sealCount++;
  xp += 10;
  if(sealCount===1) spawnShadowBetrayer();
  if(sealCount===3){finalEscapeAnnounced=true;guardianSpeed=3.2;}

  const explanation = data.explanation;

  closeMechanism();
  updateHUD();
  playSound("success");

  // The hunter remains in the maze after a seal is solved.
  // Solving a puzzle does not magically remove the enemy.

  showMessage(
    "SEAL UNLOCKED",
    `${explanation}\n\n+10 XP earned. Another royal seal has been restored.`,
    "✦",
    "MATHEMATICAL VERDICT"
  );

  if (sealCount === 3) {
    showToast("FINAL ESCAPE · BOTH BETRAYERS ARE HUNTING YOU!",true);
  } else {
    showToast(`SEAL RESTORED · ${sealCount}/3`);
  }
}

/* =========================================================
   GUARDIAN
========================================================= */

function spawnGuardian() {
  if (guardian) {
    guardianActive = true;
    return;
  }

  guardianActive = true;
  guardian = new THREE.Group();

  const darkArmour = new THREE.MeshStandardMaterial({
    color: 0x17151f,
    roughness: 0.5,
    metalness: 0.65
  });

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.48, 1.05, 4, 8),
    darkArmour
  );

  body.position.y = 1;
  guardian.add(body);

  const shoulders = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.4, 0.6),
    materials.red
  );

  shoulders.position.y = 1.55;
  guardian.add(shoulders);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 10),
    darkArmour
  );

  head.position.y = 1.9;
  guardian.add(head);

  const eyes = new THREE.MeshBasicMaterial({
    color: 0xff243d
  });

  for (const x of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      eyes
    );

    eye.position.set(x, 1.94, 0.28);
    guardian.add(eye);
  }

  const redLight = new THREE.PointLight(0xff1c35, 2.8, 7);
  redLight.position.y = 1.8;
  guardian.add(redLight);

  // Spawn in a nearby corridor so the enemy can actually be seen.
  // Avoid spawning directly on top of the knight.
  const spawnOptions = walkable.filter(cell => {
    const d = Math.hypot(cell.x - player.position.x, cell.z - player.position.z);
    return d >= CELL * 2.1 && d <= CELL * 4.5;
  });
  const fallback = walkable.filter(cell =>
    Math.hypot(cell.x - player.position.x, cell.z - player.position.z) >= CELL * 2
  );
  const options = spawnOptions.length ? spawnOptions : fallback;
  const spawnPoint = options.length
    ? options[Math.floor(random() * options.length)]
    : { x: player.position.x + CELL * 2, z: player.position.z };

  guardian.position.set(spawnPoint.x, 0, spawnPoint.z);
  guardianPath = [];
  guardianPathTimer = 0;

  scene.add(guardian);
  showToast("THE GUARDIAN HAS AWAKENED!", true);
}


function spawnShadowBetrayer(){
  if(shadowBetrayer||!player)return;
  const dark=new THREE.MeshStandardMaterial({color:0x111423,metalness:0.65,roughness:0.42});
  const crimson=new THREE.MeshStandardMaterial({color:0x70112b,emissive:0x3a0715,emissiveIntensity:0.6});
  const enemy=new THREE.Group();
  const cloak=new THREE.Mesh(new THREE.ConeGeometry(0.72,1.75,7),dark);
  cloak.position.y=0.92;enemy.add(cloak);
  const chest=new THREE.Mesh(new THREE.BoxGeometry(0.88,0.75,0.52),crimson);
  chest.position.y=1.52;enemy.add(chest);
  const hood=new THREE.Mesh(new THREE.SphereGeometry(0.37,12,10),dark);
  hood.position.y=2.07;enemy.add(hood);
  for(const x of [-0.14,0.14]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),new THREE.MeshBasicMaterial({color:0xff2448}));
    eye.position.set(x,2.09,0.31);enemy.add(eye);
  }
  for(const x of [-0.7,0.7]){
    const blade=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.85,5),materials.steel);
    blade.rotation.z=Math.PI;blade.position.set(x,0.95,0.35);enemy.add(blade);
  }
  const light=new THREE.PointLight(0xff1740,2.7,7);light.position.y=1.7;enemy.add(light);
  const candidates=walkable.filter(c=>{
    const d=Math.hypot(c.x-player.position.x,c.z-player.position.z);
    return d>=CELL*3 && d<=CELL*7 && (!guardian||Math.hypot(c.x-guardian.position.x,c.z-guardian.position.z)>CELL*2);
  });
  const spawn=candidates.length?candidates[Math.floor(random()*candidates.length)]:walkable[walkable.length-1];
  enemy.position.set(spawn.x,0,spawn.z);
  scene.add(enemy);shadowBetrayer=enemy;shadowPath=[];shadowPathTimer=0;
  showToast("SECOND BETRAYER RELEASED · RUN!",true);
}
function updateShadowBetrayer(dt){
  if(!shadowBetrayer||!player||gameEnded||!gameStarted)return;
  if(!ui.mechanism.classList.contains("hidden")||!ui.message.classList.contains("hidden"))return;
  // Follow the knight, not an extrapolated location that can be behind him.
  // Finish each corridor waypoint before replanning to avoid backtracking.
  shadowPathTimer-=dt;
  const playerCellX=Math.round(player.position.x/CELL+HALF);
  const playerCellZ=Math.round(player.position.z/CELL+HALF);
  const currentGoal=cellKey(playerCellX,playerCellZ);
  if(!shadowPath.length || (shadowPathTimer<=0 && shadowBetrayer.userData.lastGoal!==currentGoal)){
    shadowPathTimer=0.6;
    shadowBetrayer.userData.lastGoal=currentGoal;
    shadowPath=findGuardianPath(shadowBetrayer.position.x,shadowBetrayer.position.z,player.position.x,player.position.z);
  }
  // Consume reached waypoints; otherwise a frequent replan can make the ghost retreat.
  while(shadowPath.length && Math.hypot(shadowPath[0].x-shadowBetrayer.position.x,shadowPath[0].z-shadowBetrayer.position.z)<0.18){
    shadowPath.shift();
  }
  const target=shadowPath[0]||player.position;
  const dx=target.x-shadowBetrayer.position.x,dz=target.z-shadowBetrayer.position.z;
  const distance=Math.hypot(dx,dz);
  if(distance>0.06){
    const speed=sealCount>=3?4.0:sealCount>=2?3.45:3.05;
    const step=Math.min(speed*dt,distance);
    const nx=shadowBetrayer.position.x+dx/distance*step;
    const nz=shadowBetrayer.position.z+dz/distance*step;
    if(!isBlocked(nx,shadowBetrayer.position.z,0.34))shadowBetrayer.position.x=nx;
    if(!isBlocked(shadowBetrayer.position.x,nz,0.34))shadowBetrayer.position.z=nz;
    shadowBetrayer.rotation.y=Math.atan2(dx,dz);
  }
  shadowBetrayer.userData.t=(shadowBetrayer.userData.t||0)+dt;
  shadowBetrayer.children[0].position.y=0.92+Math.sin(shadowBetrayer.userData.t*11)*0.08;
  if(Math.hypot(player.position.x-shadowBetrayer.position.x,player.position.z-shadowBetrayer.position.z)<1.25 &&
    performance.now()>shadowCooldown){
    shadowCooldown=performance.now()+2000;
    health=Math.max(0,health-1);updateHUD();playSound("guardian-hit");flashDamage();
    showToast("THE SHADOW STALKER STRIKES · -1 HEALTH",true);
    if(health<=0)failGame("health");
  }
}

function recoverPlayer() {
  health = 3;
  xp = Math.max(0, xp - 15);

  guardianActive = false;

  if (guardian) {
    scene.remove(guardian);
    guardian = null;
  }
  if(shadowBetrayer){scene.remove(shadowBetrayer);shadowBetrayer=null;}

  const start = gridToWorld(1, 1);
  player.position.set(start.x, 0, start.z);

  updateHUD();

  showMessage(
    "RETURN TO THE ENTRANCE",
    "You have lost all three health points and have been returned to the entrance. Your unlocked seals remain restored. Watch for traps and choose carefully.",
    "↻",
    "RECOVERY PROTOCOL"
  );
}

// Grid-based shortest-path pursuit: follows corridors and turns at corners.
// Direct-line pursuit used to get stuck against walls in the old version.
function findGuardianPath(fromX, fromZ, toX, toZ) {
  const sx = Math.round(fromX / CELL + HALF);
  const sz = Math.round(fromZ / CELL + HALF);
  const tx = Math.round(toX / CELL + HALF);
  const tz = Math.round(toZ / CELL + HALF);
  if (!isWalk(sx, sz) || !isWalk(tx, tz)) return [];
  const queue = [[sx, sz]];
  const seen = new Set([cellKey(sx, sz)]);
  const parents = new Map();
  let head = 0;
  while (head < queue.length) {
    const [x, z] = queue[head++];
    if (x === tx && z === tz) {
      const route = [];
      let key = cellKey(tx, tz);
      while (key !== cellKey(sx, sz)) {
        const [gx, gz] = key.split(',').map(Number);
        route.push(gridToWorld(gx, gz));
        key = parents.get(key);
        if (!key) break;
      }
      return route.reverse();
    }
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, nz = z + dz;
      const key = cellKey(nx, nz);
      if (!seen.has(key) && isWalk(nx, nz)) {
        seen.add(key);
        parents.set(key, cellKey(x, z));
        queue.push([nx, nz]);
      }
    }
  }
  return [];
}

function updateGuardian(dt) {
  if (!guardian || !guardianActive || !player) return;
  // Do not attack the player while a question or story overlay is open.
  if (!ui.mechanism.classList.contains("hidden") ||
      !ui.message.classList.contains("hidden")) return;

  guardianPathTimer -= dt;
  if (guardianPathTimer <= 0) {
    guardianPathTimer = 0.35;
    guardianPath = findGuardianPath(
      guardian.position.x, guardian.position.z,
      player.position.x, player.position.z
    );
  }

  const target = guardianPath[0] || player.position;
  const dx = target.x - guardian.position.x;
  const dz = target.z - guardian.position.z;
  const distanceToTarget = Math.hypot(dx, dz);
  if (distanceToTarget > 0.06) {
    const step = Math.min(guardianSpeed * dt, distanceToTarget);
    const nx = guardian.position.x + dx / distanceToTarget * step;
    const nz = guardian.position.z + dz / distanceToTarget * step;
    if (!isBlocked(nx, guardian.position.z, 0.36)) guardian.position.x = nx;
    if (!isBlocked(guardian.position.x, nz, 0.36)) guardian.position.z = nz;
    guardian.rotation.y = Math.atan2(dx, dz);
  } else if (guardianPath.length) {
    guardianPath.shift();
  }

  // A visible menacing bob and glow, without changing the maze visuals.
  guardian.userData.chaseTime = (guardian.userData.chaseTime || 0) + dt;
  guardian.children[0].position.y = 1 + Math.sin(guardian.userData.chaseTime * 9) * 0.07;
  guardianSpeed = Math.min(guardianSpeed + dt * 0.006, 2.85);

  const distance = Math.hypot(
    player.position.x - guardian.position.x,
    player.position.z - guardian.position.z
  );
  if (distance < 1.25 && performance.now() > guardianCooldown) {
    guardianCooldown = performance.now() + 1800;
    health = Math.max(0, health - 1);
    updateHUD();
    playSound("guardian-hit");
    flashDamage();
    showToast("THE GUARDIAN STRIKES · -1 HEALTH", true);
    if (health <= 0) { failGame("health"); return; }
  }
}

/* =========================================================
   TRAP UPDATE
========================================================= */

function updateTraps(dt) {
  if (!player || !gameStarted || gameEnded) return;
  if(!ui.mechanism.classList.contains("hidden")||!ui.message.classList.contains("hidden"))return;

  for (const trap of traps) {
    trap.timer -= dt;

    if (trap.state === "idle" && trap.timer <= 0) {
      trap.state = "warning";
      trap.timer = 1.3;
      trap.hit = false;

      // No sound for automatic trap warning.
    } else if (trap.state === "warning") {
      trap.warning.material.opacity =
        0.3 +
        0.45 *
          (0.5 + 0.5 * Math.sin(performance.now() * 0.025));

      trap.light.intensity = 1.8;

      if (trap.timer <= 0) {
        trap.state = "armed";
        trap.timer = 1.0;

        trap.spikes.forEach(spike => {
          spike.position.y = 0.25;
        });

        // No sound for automatic trap activation.
      }
    } else if (trap.state === "armed") {
      const distance = Math.hypot(
        player.position.x - trap.group.position.x,
        player.position.z - trap.group.position.z
      );

      if (distance < 1.15 && !trap.hit) {
        trap.hit = true;
        health = Math.max(0, health - 1);

        updateHUD();
        playSound("trap");
        flashDamage();

        showToast("TRAP TRIGGERED · -1 HEALTH", true);

        if (health <= 0) {
          recoverPlayer();
        }
      }

      if (trap.timer <= 0) {
        trap.state = "cooldown";
        trap.timer = 2.4;

        trap.spikes.forEach(spike => {
          spike.position.y = -0.22;
        });

        trap.light.intensity = 0;
      }
    } else if (
      trap.state === "cooldown" &&
      trap.timer <= 0
    ) {
      trap.state = "idle";
      trap.timer = 3 + random() * 4;
      trap.warning.material.opacity = 0.3;
    }
  }
}

/* =========================================================
   MINIMAP
========================================================= */

function drawMinimap() {
  const canvas = ui.minimap;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cellWidth = width / GRID;
  const cellHeight = height / GRID;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0a1220";
  ctx.fillRect(0, 0, width, height);

  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      ctx.fillStyle = isWalk(x, z)
        ? ((x + z) % 3 === 0 ? "#29344a" : "#1b2639")
        : "#0b101a";

      ctx.fillRect(
        x * cellWidth,
        z * cellHeight,
        cellWidth - 0.5,
        cellHeight - 0.5
      );
    }
  }

  for (const item of interactables) {
    if (item.used) continue;

    const x = (item.cell.gx + 0.5) * cellWidth;
    const z = (item.cell.gz + 0.5) * cellHeight;

    ctx.beginPath();
    ctx.fillStyle = "#69d2ff";
    ctx.shadowColor = "#69d2ff";
    ctx.shadowBlur = 7;
    ctx.arc(x, z, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  const exitX = 17.5 * cellWidth;
  const exitZ = 17.5 * cellHeight;

  ctx.fillStyle = sealCount >= 3 ? "#f8d37d" : "#705b3b";
  ctx.fillRect(exitX - 3, exitZ - 3, 6, 6);

  if (guardian && guardianActive) {
    const gx = Math.round(
      guardian.position.x / CELL + HALF
    );

    const gz = Math.round(
      guardian.position.z / CELL + HALF
    );

    ctx.fillStyle = "#ff4058";
    ctx.beginPath();

    ctx.arc(
      (gx + 0.5) * cellWidth,
      (gz + 0.5) * cellHeight,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  if(shadowBetrayer){
    const gx=shadowBetrayer.position.x/CELL+HALF;
    const gz=shadowBetrayer.position.z/CELL+HALF;
    ctx.fillStyle="#ff8c45";ctx.beginPath();
    ctx.arc((gx+0.5)*cellWidth,(gz+0.5)*cellHeight,3.5,0,Math.PI*2);ctx.fill();
  }
  if (player) {
    const px =
      (player.position.x / CELL + HALF + 0.5) * cellWidth;

    const pz =
      (player.position.z / CELL + HALF + 0.5) * cellHeight;

    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/* =========================================================
   EXIT AND GAME FLOW
========================================================= */

function checkExit() {
  if (!player || sealCount < 3 || gameEnded) return;

  const exit = gridToWorld(17, 17);

  const distance = Math.hypot(
    player.position.x - exit.x,
    player.position.z - exit.z
  );

  if (distance < 2.4) {
    finishGame();
  }
}

function failGame(reason = "time") {
  if (gameEnded) return;

  gameEnded = true;
  gameStarted = false;
  guardianActive = false;
  stopMazeMusic();

  elapsed = (performance.now() - startTime) / 1000;

  const name = getPlayerName();

  if (reason === "time") {
    ui.endingSummary.textContent =
      `Time has run out, ${name}. The three seals remain beyond your reach. ` +
      `Your mission in Aurilia has failed. Restore your strength and try again.`;

    ui.finalTime.textContent = "00:00";
  } else {
    ui.endingSummary.textContent =
      `You have lost all your health, ${name}. The guardian has defeated you. ` +
      `Your mission in Aurilia has failed. Try again and protect your remaining health.`;

    ui.finalTime.textContent = formatTime(
      Math.max(0, 180 - elapsed)
    );
  }

  window.AuriliaKnight?.recordTrialResult("game02", xp, false);
  
  ui.finalXP.textContent = xp;
  ui.ending.classList.remove("hidden");
}

function finishGame() {
  if (gameEnded) return;

  gameEnded = true;
  gameStarted = false;
  guardianActive = false;
  stopMazeMusic();

  elapsed = (performance.now() - startTime) / 1000;

  // Simpan XP Game 2 untuk halaman utama.
  try {
    localStorage.setItem("auriliaGame2XP", String(xp));
  } catch (error) {
    console.warn("Game 2 XP could not be saved.", error);
  }

  updateHUD();
  // Record Game 2 completion in the shared campaign.
  // The latest attempt replaces the previous XP and completion status.
  // Replaying does not accumulate XP from earlier attempts.
  window.AuriliaKnight?.recordTrialResult(
    "game02",
    xp,
    true
  );
  const name = getPlayerName();

  ui.endingSummary.textContent =
    `Well done, ${name}. You restored all three seals of Aurilia ` +
    `and reached the exit with ${health} health remaining. ` +
    `You have proven your understanding of positive square roots.`;

  ui.finalXP.textContent = xp;
  ui.finalTime.textContent = formatTime(elapsed);

  ui.ending.classList.remove("hidden");

  playSound("win");

  // Launch the epilogue only after all four trials are completed.
  // Keep the victory screen visible for 6 seconds.
  if (window.AuriliaKnight?.isCampaignComplete()) {
    setTimeout(() => {
      window.AuriliaKnight.checkAndLaunchEpilogue();
    }, 1000);
  }
}

function startGame() {
  const name = getPlayerName();

  ui.intro.classList.add("hidden");

  gameStarted = true;
  gameEnded = false;

  startTime = performance.now();
  elapsed = 0;

  lastTimerWarning = false;
  timeoutWarningShown = false;

  updateHUD();
  startMazeMusic();
  playSound("success");
  // A visible enemy hunts the knight from the beginning, Pac-Man style.
  spawnGuardian();

  showMessage(
    `Welcome, ${name}`,
    `Three ancient seals are hidden throughout the maze.\n\n` +
    `Approach a blue crystal and press E to inspect its mechanism. ` +
    `Use WASD to move, hold SHIFT to run, and drag the mouse to rotate the camera.\n\n` +
    `Beware: the crimson guardian is already hunting you through the corridors! ` +
    `Run to escape. Traps and wrong answers cost health.`,
    "✦",
    "THE ARCHIVIST'S WARNING"
  );
}

function restartGame() {
  /*
    The next layout index was saved before the world loaded.
    Reloading therefore advances to the next maze.
  */
  window.location.reload();
}

/* =========================================================
   INPUT
========================================================= */

function onKeyDown(event) {
  keys[event.code] = true;

  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space"
    ].includes(event.code)
  ) {
    event.preventDefault();
  }

  // ENTER: Start game or continue story messages.
  if (event.code === "Enter") {
    event.preventDefault();

    if (event.repeat) return;

    if (!ui.intro.classList.contains("hidden")) {
      startGame();
      return;
    }

    if (!ui.message.classList.contains("hidden")) {
      ui.messageClose.click();
      return;
    }

    if (!ui.mechanism.classList.contains("hidden")) {
      confirmGear();
      return;
    }

    // Do not automatically replay at the ending screen.
    if (gameEnded) return;
  }

  // E: Interact with nearby seals.
  if (
    event.code === "KeyE" &&
    gameStarted &&
    !gameEnded &&
    ui.mechanism.classList.contains("hidden") &&
    ui.message.classList.contains("hidden")
  ) {
    const near = nearbySeal();

    if (near) {
      openMechanism(near);
    }
  }

  // ESC: Close the mechanism.
  if (
    event.code === "Escape" &&
    !ui.mechanism.classList.contains("hidden")
  ) {
    closeMechanism();
    return;
  }

  // Rotate the gear using arrow keys or A / D.
  if (!ui.mechanism.classList.contains("hidden")) {
    if (
      event.code === "ArrowLeft" ||
      event.code === "KeyA"
    ) {
      updateGear(-1);
    }

    if (
      event.code === "ArrowRight" ||
      event.code === "KeyD"
    ) {
      updateGear(1);
    }
  }

  // R: Replay after finishing.
  if (event.code === "KeyR" && gameEnded) {
    restartGame();
  }
}

function onKeyUp(event) {
  keys[event.code] = false;
}

/* =========================================================
   ANIMATION LOOP
========================================================= */

function animate() {
  requestAnimationFrame(animate);

  if (!renderer || !scene || !camera) return;

  const dt = Math.min(clock.getDelta(), 0.04);
  const now = performance.now();

  if (gameStarted && !gameEnded) {
  const timeLimit = 180;

  elapsed = (now - startTime) / 1000;

  const timeLeft = Math.max(0, timeLimit - elapsed);

  // Paparkan baki masa, bukan masa yang telah berlalu.
  ui.timer.textContent = formatTime(timeLeft);

  // Amaran apabila tinggal 60 saat.
  if (timeLeft <= 60 && !lastTimerWarning) {
    lastTimerWarning = true;

    showToast("WARNING · 60 SECONDS REMAINING!", true);
    playSound("alarm");
  }

  // Masa habis = pemain gagal.
  if (timeLeft <= 0) {
    failGame("time");
    return;
  }

    movePlayer(dt);
    updateTraps(dt);
    updateWallTraps(dt);
    updateGuardian(dt);
    updateShadowBetrayer(dt);
    checkExit();

    torches.forEach(torch => {
      const pulse =
        0.83 +
        Math.sin(now * 0.004 + torch.phase) * 0.17;

      torch.light.intensity = 6 * pulse;

      torch.flame.scale.y =
        0.8 +
        Math.sin(now * 0.012 + torch.phase) * 0.18;

      torch.halo.scale.setScalar(
        1 + Math.sin(now * 0.004 + torch.phase) * 0.1
      );
    });

    interactables.forEach(item => {
      item.crystal.rotation.y += dt * 0.7;
      item.crystal.rotation.x += dt * 0.2;

      item.crystal.position.y =
        1.65 +
        Math.sin(now * 0.002 + item.index) * 0.12;

      item.light.intensity =
        1.8 +
        Math.sin(now * 0.003 + item.index) * 0.5;

      item.ring.rotation.z += dt * 0.15;
    });

    if (exitGate) {
      const pulse = 1 + Math.sin(now * 0.003) * 0.1;

      exitGate.userData.symbol.scale.setScalar(pulse);

      exitGate.userData.light.intensity =
        sealCount >= 3 ? 3 : 0.6;
    }

    const near = nearbySeal();

    if (
      near &&
      ui.mechanism.classList.contains("hidden") &&
      ui.message.classList.contains("hidden")
    ) {
      ui.prompt.classList.remove("hidden");
      ui.promptText.textContent = `Examine Seal ${near.index + 1}`;
    } else {
      ui.prompt.classList.add("hidden");
    }

    updateHUD();
    drawMinimap();
  }

  if (player) {
    updateCamera(dt);
  }

  renderer.render(scene, camera);
}

/* =========================================================
   INITIALISE
========================================================= */

function init() {
  clock = new THREE.Clock();

  prepareNextLayout();
  buildWorld();
  setupCameraControls();

  const name = getPlayerName();

  if (name && ui.welcome) {
    ui.welcome.textContent = `Welcome back, ${name}`;
    ui.welcome.classList.remove("hidden");
  }

  ui.start.addEventListener("click", startGame);

  ui.down.addEventListener("click", () => updateGear(-1));
  ui.up.addEventListener("click", () => updateGear(1));

  ui.engage.addEventListener("click", confirmGear);
  ui.leave.addEventListener("click", closeMechanism);

  ui.messageClose.addEventListener("click", () => {
    ui.message.classList.add("hidden");
  });

  ui.sound.addEventListener("click", () => {
    soundOn = !soundOn;

    ui.sound.innerHTML = soundOn
      ? "♫ <span>SOUND: ON</span>"
      : "♩ <span>SOUND: OFF</span>";

    if (soundOn) {
      startMazeMusic();
      playSound("click");
    } else {
      mazeMusic.pause();
    }
  });

  ui.returnButton.addEventListener("click", restartGame);
  const backToQuestButton = document.getElementById("back-to-quest");

  if (backToQuestButton) {
    backToQuestButton.addEventListener("click", () => {
      window.location.href = "main-quest.html";
    });
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  window.addEventListener("pagehide", () => mazeMusic.pause());

  window.addEventListener("blur", () => {
    keys = {};
    draggingCamera = false;
  });

  window.addEventListener("resize", () => {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  });

  drawMinimap();
  animate();
}

init();