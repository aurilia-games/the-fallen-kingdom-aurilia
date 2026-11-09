(() => {
  "use strict";

  // STARFALL CITADEL — THE TWIN-RUNE TRIAL
  // DSKP 3.1.3 | Self-contained canvas game

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  // ---------- SHARED PLAYER IDENTITY ----------

  
  function getPlayerName() {
    // Prioritise the shared Aurilia player identity.
    const sharedName = window.AuriliaKnight?.getPlayerName?.();

    if (
      typeof sharedName === "string" &&
      sharedName.trim() &&
      sharedName.trim() !== "Royal Candidate"
    ) {
      return sharedName.trim();
    }

    // Fallback to the name saved after Game 1.
    try {
      const savedName = localStorage.getItem("auriliaPlayerName");

      if (savedName && savedName.trim()) {
        return savedName.trim();
      }
    } catch (error) {
      console.warn("Could not read player name.", error);
    }

    return "Royal Candidate";
  }


  const ui = {
    lives: $("lives"),
    xp: $("xp"),
    progress: $("progress"),
    equation: $("equation"),
    objective: $("objective"),
    message: $("world-message"),
    toast: $("toast"),
    start: $("start-screen"),
    end: $("end-screen"),
    startButton: $("start-button"),
    restartButton: $("restart-button"),
    sound: $("sound-toggle"),
    endingTitle: $("ending-title"),
    endingCopy: $("ending-copy"),
    finalXP: $("final-xp"),
    finalSeals: $("final-seals")
  };

  const W = 1280;
  const H = 720;
  const WORLD = 2100;
  const GRAVITY = 0.62;
  const SPEED = 4.25;
  const JUMP = 13;
  const MAX_LIVES = 5;

  canvas.width = W;
  canvas.height = H;

  
  // ---------- RANDOM CHALLENGE SYSTEM ----------

  const QUESTION_BANK = [
    { n: 49,  options: [6, -8, -7, 8, 7, -6] },
    { n: 64,  options: [-7, 9, 8, -8, 7, -9] },
    { n: 36,  options: [5, -7, -6, 7, 6, -5] },
    { n: 81,  options: [-8, 10, -9, 8, 9, -10] },
    { n: 25,  options: [4, -6, 5, -5, 6, -4] },
    { n: 100, options: [11, -9, -10, 9, 10, -11] },
    { n: 121, options: [-10, 12, 11, -11, 10, -12] },
    { n: 144, options: [13, -11, -12, 12, 11, -13] },
    { n: 169, options: [-12, 14, 13, -13, 12, -14] },
    { n: 196, options: [15, -13, -14, 14, 13, -15] },
    { n: 225, options: [-14, 16, 15, -15, 14, -16] },
    { n: 256, options: [17, -15, -16, 16, 15, -17] }
  ];

  function shuffleArray(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function generateChallenges() {
    const shuffled = shuffleArray(QUESTION_BANK);

    return shuffled.map(challenge => ({
      n: challenge.n,
      options: shuffleArray(challenge.options)
    }));
  }

  let challenges = generateChallenges();

  const stageNames = [
    "THE BROKEN OBSERVATORY",
    "THE CRYSTAL SPAN",
    "THE STORM GALLERY",
    "THE CROWN ENGINE"
  ];

  const s = {
    running: false,
    ended: false,
    index: 0,
    xp: 0,
    lives: MAX_LIVES,
    seals: 0,
    flawless: true,
    keys: {},
    platforms: [],
    runes: [],
    particles: [],
    stars: [],
    camera: 0,
    time: 0,
    last: 0,
    toastTime: 0,
    clearTime: 0,
    finaleReady: false,
    cinematic: null,
    shake: 0,
    flash: 0,
    damageCooldown: 0,
    soundOn: true,
    audio: null,
    player: {
      x: 80, y: 470, w: 34, h: 56,
      vx: 0, vy: 0, ground: false,
      facing: 1, invulnerable: 0, step: 0
    },
    altar: { x: 160, y: 560, active: false, pulse: 0 },
    bridge: { active: false, progress: 0 },
    dragon: {
      x: 650, y: 175, direction: 1,
      phase: "fly", timer: 5,
      fireX: 0, fireTime: 0,
      wing: 0
    }
  };

  // Background music: separate from existing Web Audio sound effects.
  // Keep the MP3 at assets/audio/game-03.mp3 in the project root.
  const backgroundMusic = new Audio("../assets/audio/game-03.mp3");
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.08;
  backgroundMusic.preload = "auto";

  function playBackgroundMusic() {
    if (!s.soundOn || !s.running || s.ended) return;
    const promise = backgroundMusic.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(error => console.warn("Game 3 background music could not play:", error));
    }
  }

  function stopBackgroundMusic(reset = false) {
    backgroundMusic.pause();
    if (reset) backgroundMusic.currentTime = 0;
  }

  // ---------- CINEMATIC MUSIC: KNIGHT & DRAGON ----------

  const cinematicMusic = new Audio("../assets/audio/game-03-cinematic.mp3");

  cinematicMusic.loop = false;
  cinematicMusic.volume = 0.65;
  cinematicMusic.preload = "auto";

  function playCinematicMusic() {
    if (!s.soundOn) return;

    cinematicMusic.currentTime = 0;
    cinematicMusic.play().catch(error => {
      console.warn("Cinematic music could not play:", error);
    });
  }

  function stopCinematicMusic() {
    cinematicMusic.pause();
    cinematicMusic.currentTime = 0;
  }

  // ---------- SOUND ----------

  function initAudio() {
    if (!s.audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      s.audio = new AC();
    }
    if (s.audio.state === "suspended") s.audio.resume();
  }

  function tone(freq, duration, type = "sine", volume = 0.035, delay = 0) {
    if (!s.soundOn || !s.audio) return;
    const ac = s.audio;
    const start = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  function noise(duration = 0.4, volume = 0.06) {
    if (!s.soundOn || !s.audio) return;
    const ac = s.audio;
    const buffer = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }

  function sound(name) {
    if (!s.soundOn) return;
    if (name === "jump") {
      tone(230, .12, "triangle", .025);
      tone(360, .15, "sine", .02, .05);
    } else if (name === "correct") {
      tone(523, .16, "sine", .035);
      tone(659, .2, "sine", .035, .1);
      tone(784, .3, "sine", .04, .22);
    } else if (name === "wrong") {
      // Distinctive magical failure sound
      if (!s.soundOn || !s.audio) return;
      noise(0.22, 0.10);
      tone(440, 0.12, "square", 0.045);
      tone(220, 0.20, "sawtooth", 0.055, 0.12);
      tone(110, 0.32, "square", 0.045, 0.25);
    } else if (name === "warning") {
      tone(100, .2, "sawtooth", .045);
      tone(100, .2, "sawtooth", .045, .3);
      tone(100, .2, "sawtooth", .045, .6);
    } else if (name === "fire") {
      noise(.65, .12);
      tone(72, .5, "sawtooth", .04);
    } else if (name === "fall") {
      noise(.3, .07);
      tone(100, .25, "triangle", .03);
    } else if (name === "bridge") {
      tone(330, .2, "sine", .035);
      tone(440, .25, "sine", .035, .12);
      tone(660, .4, "sine", .04, .24);
    } else if (name === "victory") {
      [392, 494, 587, 784].forEach((f, i) =>
        tone(f, .55, "sine", .045, i * .17)
      );
    }
  }

  ui.sound.addEventListener("click", () => {
    s.soundOn = !s.soundOn;
    ui.sound.textContent = s.soundOn ? "♫ SOUND: ON" : "♫ SOUND: OFF";
    if (s.soundOn) {
      initAudio();
      tone(440, .12);
      playBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  });

  // ---------- WORLD ----------

  function createStars() {
    s.stars = Array.from({ length: 190 }, () => ({
      x: Math.random() * WORLD,
      y: Math.random() * 560,
      r: Math.random() * 1.7 + .3,
      phase: Math.random() * 6,
      speed: Math.random() * 2 + .5
    }));
  }

  function buildWorld() {
    s.platforms = [
      { x: 0, y: 610, w: 280, h: 100, type: "ground" },
      { x: 300, y: 560, w: 190, h: 30 },
      { x: 510, y: 485, w: 190, h: 30 },
      { x: 720, y: 555, w: 180, h: 30 },
      { x: 920, y: 475, w: 190, h: 30 },
      { x: 1130, y: 550, w: 190, h: 30 },
      { x: 1340, y: 470, w: 200, h: 30 },
      { x: 1560, y: 545, w: 200, h: 30 },
      { x: 1770, y: 610, w: 330, h: 100, type: "exit" }
    ];

    s.runes = [];
    s.particles = [];
    s.altar.active = false;
    s.altar.pulse = 0;
    s.bridge = { active: false, progress: 0 };
    s.clearTime = 0;
    s.finaleReady = false;
    s.cinematic = null;

    const challenge = challenges[s.index];
    const xs = [360, 545, 735, 935, 1165, 1435];
    const ys = [520, 450, 520, 440, 515, 435];

    xs.forEach((x, i) => {
      s.platforms.push({
        x: x - 48, y: ys[i] + 43, w: 120, h: 18, type: "rune-ledge"
      });

      const value = challenge.options[i];
      s.runes.push({
        x, y: ys[i], value,
        correct: Math.abs(value) === Math.sqrt(challenge.n),
        activated: false,
        pulse: Math.random() * 6,
        wrongTime: 0
      });
    });

    s.player.x = 80;
    s.player.y = 480;
    s.player.vx = 0;
    s.player.vy = 0;
    s.player.ground = false;
    s.player.invulnerable = 1.2;
    s.camera = 0;
    s.damageCooldown = 0;

    s.dragon = {
      x: 650, y: 220, direction: 1,
      phase: "fly", timer: 5,
      fireX: 0, fireTime: 0,
      wing: 0
    };

    updateHUD();
    ui.message.textContent = "Find the Star Core. Press E beside it.";
  }

  function updateHUD() {
    ui.lives.textContent = Array.from({ length: MAX_LIVES }, (_, i) =>
      i < s.lives ? "♥" : "♡"
    ).join(" ");
    ui.xp.textContent = `${s.xp} XP`;
    ui.progress.textContent =
      `${String(Math.min(s.index + 1, 12)).padStart(2, "0")} / 12`;
    ui.equation.textContent = s.index < 12
      ? `x² = ${challenges[s.index].n}`
      : "CITADEL RESTORED";
    ui.objective.textContent =
      "Find both solutions. Activate the matching runes.";
  }

  function toast(message, seconds = 2) {
    ui.toast.textContent = message;
    ui.toast.classList.add("visible");
    s.toastTime = seconds;
  }

  function particles(x, y, count = 20, color = "gold") {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        size: Math.random() * 4 + 1,
        color
      });
    }
  }

  // ---------- PLAYER PHYSICS ----------

  function movePlayer(dt) {
    const p = s.player;
    const left = s.keys.ArrowLeft || s.keys.KeyA;
    const right = s.keys.ArrowRight || s.keys.KeyD;
    const jumping = s.keys.Space || s.keys.KeyW || s.keys.ArrowUp;

    p.vx = 0;
    if (left) { p.vx = -SPEED; p.facing = -1; }
    if (right) { p.vx = SPEED; p.facing = 1; }

    if (jumping && p.ground) {
      p.vy = -JUMP;
      p.ground = false;
      sound("jump");
    }

    p.vy = Math.min(p.vy + GRAVITY, 16);
    const oldY = p.y;
    p.x = Math.max(0, Math.min(WORLD - p.w, p.x + p.vx));
    p.y += p.vy;
    p.ground = false;

    if (p.vy >= 0) {
      for (const plat of s.platforms) {
        const wasAbove = oldY + p.h <= plat.y + 5;
        const crosses = p.y + p.h >= plat.y;
        const horizontal = p.x + p.w > plat.x && p.x < plat.x + plat.w;
        if (wasAbove && crosses && horizontal) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.ground = true;
        }
      }
    }

    if (p.y > H + 100) loseLife("fall");

    p.step += dt * (Math.abs(p.vx) > 0 ? 12 : 3);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    s.damageCooldown = Math.max(0, s.damageCooldown - dt);
  }

  function loseLife(reason) {
    const p = s.player;
    if (p.invulnerable > 0 || s.damageCooldown > 0 || s.ended) return;

    s.lives--;
    s.flawless = false;
    p.invulnerable = 1.8;
    s.damageCooldown = 1.1;
    s.shake = 13;
    s.flash = .3;
    particles(p.x + 15, p.y + 25, 28, "violet");
    sound(reason === "fall" ? "fall" : "fire");
    updateHUD();

    if (s.lives <= 0) {
      s.lives = 0;
      updateHUD();
      endGame(false);
      return;
    }

    toast(reason === "fall"
      ? `You fell! One life lost. ${s.lives} remaining.`
      : `The dragon's fire hit you! One life lost. ${s.lives} remaining.`, 2.3);

    p.x = 80;
    p.y = 480;
    p.vx = 0;
    p.vy = 0;
    p.ground = false;
    s.camera = 0;
  }

  // ---------- RUNE INTERACTION ----------

  function distanceToRune(r) {
    return Math.hypot(
      s.player.x + s.player.w / 2 - r.x,
      s.player.y + s.player.h / 2 - r.y
    );
  }

  function getTarget() {
    const p = s.player;
    if (!s.altar.active &&
        Math.hypot(p.x + p.w / 2 - s.altar.x, p.y + p.h / 2 - s.altar.y) < 100) {
      return { kind: "altar", item: s.altar };
    }

    let best = null;
    for (const rune of s.runes) {
      if (rune.activated) continue;
      const d = distanceToRune(rune);
      if (d < 82 && (!best || d < best.d)) {
        best = { kind: "rune", item: rune, d };
      }
    }
    return best;
  }

  function fmt(n) {
    return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
  }

  
  function interact() {
    if (!s.running || s.ended || s.clearTime > 0) return;

    const target = getTarget();

    if (!target) {
      toast("Move closer to the Star Core or a rune.", 1.2);
      return;
    }

    if (target.kind === "altar") {
      s.altar.active = true;
      particles(s.altar.x, s.altar.y, 28, "blue");
      tone(490, .2);
      toast("Star Core awakened. Find both solutions across the citadel.", 2.2);
      ui.message.textContent =
        "Activate both correct runes. The dragon is hunting.";
      return;
    }

    const r = target.item;

    if (r.correct) {
      r.activated = true;
      s.xp += 10;

      particles(r.x, r.y, 20, "gold");
      sound("correct");
      toast(`${fmt(r.value)} rune correct! +10 XP`, 1.8);
    } else {
      r.wrongTime = 1;
      s.xp = Math.max(0, s.xp - 5);

      particles(r.x, r.y, 12, "violet");
      sound("wrong");
      toast(`${fmt(r.value)} is incorrect! −5 XP`, 2);
    }

    updateHUD();

    if (
      s.runes.filter(
        rune => rune.correct && rune.activated
      ).length === 2
    ) {
      completeMechanism();
    }
  }

  
  function completeMechanism() {
    if (s.clearTime > 0) return;

    s.seals++;
    s.clearTime = s.seals === challenges.length ? 1.9 : 2.6;
    s.bridge.active = true;
    s.bridge.progress = 0;
    s.shake = 5;

    particles(1000, 370, 65, "gold");
    particles(1480, 380, 45, "blue");

    sound("bridge");
    updateHUD();

    toast("TWIN RUNES ALIGNED · MECHANISM RESTORED!", 2.5);
    ui.message.textContent = s.seals === challenges.length
      ? "All twelve seals restored! Reach the Crown Gate at the far right."
      : "The twin runes are aligned. Watch the star bridge form!";
  }

  function nextChallenge() {
    s.index++;
    if (s.index >= challenges.length) {
      endGame(true);
      return;
    }
    buildWorld();
    toast(`SEAL ${s.index + 1} / 12 — THE NEXT MECHANISM AWAITS`, 2);
  }

  // ---------- DRAGON & FIRE ----------

  
function updateDragon(dt) {
  const d = s.dragon;
  const p = s.player;

  d.wing += dt * 11;

  if (d.phase === "fly") {
    d.x += d.direction * 95 * dt;
    d.y = 205 + Math.sin(s.time * 1.3) * 18;

    if (d.x > s.camera + W + 180) {
      d.direction = -1;
    }

    if (d.x < s.camera - 100) {
      d.direction = 1;
    }

    d.timer -= dt;

    if (d.timer <= 0) {
      // Mark the player's position as the fire target.
      d.fireX = Math.max(
        80,
        Math.min(WORLD - 80, p.x + p.w / 2)
      );

      // Turn the dragon towards the target.
      d.direction = d.fireX >= d.x ? 1 : -1;

      // Move above the target before breathing fire.
      d.phase = "warning";
      d.timer = 1.15;

      sound("warning");
      toast(
        "DRAGON BREATH! Move away from the glowing fire zone!",
        1.3
      );
    }
  } else if (d.phase === "warning") {
    // Hold the dragon above the marked danger zone.
    const targetX = d.fireX;
    const desiredDragonX = targetX - d.direction * 70;

    // Smoothly position the dragon over the target.
    d.x += (desiredDragonX - d.x) * Math.min(1, dt * 3);

    // Keep it high enough for the original downward flame.
    d.y += (205 - d.y) * Math.min(1, dt * 3);

    // Face the target throughout the warning phase.
    d.direction = d.fireX >= d.x ? 1 : -1;

    d.timer -= dt;

    if (d.timer <= 0) {
      d.phase = "fire";
      d.fireTime = 0.85;

      sound("fire");
      s.shake = 5;
    }
  } else if (d.phase === "fire") {
    // Stay in position while breathing fire.
    const targetX = d.fireX;
    const desiredDragonX = targetX - d.direction * 70;

    d.x += (desiredDragonX - d.x) * Math.min(1, dt * 5);
    d.y += (125 - d.y) * Math.min(1, dt * 5);

    const hitZone =
      Math.abs((p.x + p.w / 2) - d.fireX) < 86;

    const aboveFire = p.y + p.h > 485;

    if (hitZone && aboveFire && s.damageCooldown <= 0) {
      loseLife("fire");
    }

    d.fireTime -= dt;

    if (d.fireTime <= 0) {
      d.phase = "fly";
      d.timer = 4.3 + Math.random() * 2.5;
    }
  }
}

  // ---------- SCENERY ----------

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#080d28");
    g.addColorStop(.55, "#1a204a");
    g.addColorStop(1, "#0b1027");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const nebula = ctx.createRadialGradient(820, 170, 10, 820, 170, 540);
    nebula.addColorStop(0, "rgba(111,112,255,.25)");
    nebula.addColorStop(1, "rgba(45,35,105,0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, W, H);

    for (const star of s.stars) {
      const x = star.x - s.camera * .36;
      if (x < -5 || x > W + 5) continue;
      const a = .35 + .65 * (.5 + .5 * Math.sin(s.time * star.speed + star.phase));
      ctx.fillStyle = `rgba(227,232,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Elegant distant gothic towers.
    for (let i = 0; i < 17; i++) {
      const worldX = i * 150 + 25;
      const x = worldX - s.camera * .22;
      const h = 125 + (i * 39) % 160;
      if (x < -100 || x > W + 100) continue;

      ctx.fillStyle = i % 2 ? "#111937" : "#171c42";
      ctx.beginPath();
      ctx.moveTo(x, 545);
      ctx.lineTo(x, 545 - h);
      ctx.lineTo(x + 21, 545 - h - 33);
      ctx.lineTo(x + 42, 545 - h);
      ctx.lineTo(x + 42, 545);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(223,203,145,.28)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "rgba(243,214,139,.3)";
      for (let wy = 545 - h + 25; wy < 525; wy += 34) {
        ctx.fillRect(x + 18, wy, 5, 12);
      }
    }
  }

  function drawPlatform(p) {
    const x = p.x - s.camera;
    if (x + p.w < -10 || x > W + 10) return;

    ctx.fillStyle = p.type === "exit" ? "#201b42" : "#171c3e";
    ctx.fillRect(x, p.y, p.w, p.h + 16);

    ctx.fillStyle = p.type === "exit" ? "#5b4b80" : "#343c6a";
    ctx.beginPath();
    ctx.moveTo(x, p.y);
    ctx.lineTo(x + 12, p.y - 8);
    ctx.lineTo(x + p.w, p.y - 8);
    ctx.lineTo(x + p.w, p.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(203,214,255,.3)";
    ctx.beginPath();
    ctx.moveTo(x + 5, p.y);
    ctx.lineTo(x + p.w - 5, p.y);
    ctx.stroke();

    for (let sx = x + 25; sx < x + p.w - 10; sx += 55) {
      ctx.fillStyle = "rgba(220,213,255,.14)";
      ctx.fillRect(sx, p.y + 9, 3, 3);
    }
  }

  function drawAltar() {
    const a = s.altar;
    const x = a.x - s.camera;
    const pulse = .5 + .5 * Math.sin(a.pulse);

    ctx.save();
    ctx.translate(x, a.y);

    ctx.fillStyle = "#27234e";
    ctx.beginPath();
    ctx.moveTo(-46, 42);
    ctx.lineTo(-34, 5);
    ctx.lineTo(0, -14);
    ctx.lineTo(34, 5);
    ctx.lineTo(46, 42);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = a.active ? "#ffe8a1" : "#8998e5";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 18 + pulse * 16;
    ctx.shadowColor = a.active ? "#ffe59a" : "#8e9bff";
    ctx.fillStyle = a.active ? "#fff0ac" : "#aab9ff";
    ctx.beginPath();
    ctx.arc(0, 7, 13 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e9e6ff";
    ctx.font = "700 11px Inter";
    ctx.textAlign = "center";
    ctx.fillText(a.active ? "AWAKENED" : "STAR CORE", 0, 60);
    ctx.restore();
  }

  function drawRune(r) {
    const x = r.x - s.camera;
    if (x < -60 || x > W + 60) return;
    const pulse = .5 + .5 * Math.sin(r.pulse);

    ctx.save();
    ctx.translate(x, r.y);

    ctx.strokeStyle = r.wrongTime > 0
      ? "rgba(255,91,140,.9)"
      : `rgba(155,173,255,${.35 + pulse * .4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 11, 30, 11 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 14 + pulse * 8;
    ctx.shadowColor = r.activated ? "#ffe8a0" : "#94a8ff";
    ctx.fillStyle = r.activated ? "#fff0ac" : "#8c9dff";
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(19, 0);
    ctx.lineTo(0, 26);
    ctx.lineTo(-19, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#151a39";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = r.activated ? "#fff1b5" : "#f2f3ff";
    ctx.font = "700 15px Inter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fmt(r.value), 0, 1);

    if (r.activated) {
      ctx.strokeStyle = "#fff0b8";
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBridge() {
    if (!s.bridge.active) return;
    const progress = Math.min(1, s.bridge.progress);
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#f6d986";
    ctx.strokeStyle = "#f6d986";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(165 - s.camera, 600);
    ctx.lineTo(165 + 1670 * progress - s.camera, 600);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(178,204,255,.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(165 - s.camera, 608);
    ctx.lineTo(165 + 1670 * progress - s.camera, 608);
    ctx.stroke();

    for (let i = 0; i < 28; i++) {
      const x = 165 + i * 59;
      if (x > 165 + 1670 * progress) continue;
      ctx.fillStyle = `rgba(255,237,173,${.3 + .7 * Math.sin(s.time * 4 + i) ** 2})`;
      ctx.beginPath();
      ctx.arc(x - s.camera, 600, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- HANDSOME KNIGHT ----------

  function drawKnight() {
    const p = s.player;
    if (p.invulnerable > 0 && Math.floor(s.time * 14) % 2 === 0) return;

    const x = p.x - s.camera + p.w / 2;
    const y = p.y + p.h / 2;
    const step = p.ground ? Math.sin(p.step) * 3 : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p.facing, 1);

    // Shadow.
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(0, 31, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Long, flowing midnight-blue cape.
    ctx.fillStyle = "#18274d";
    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.bezierCurveTo(-20, -3, -15, 13, -24, 27 + step);
    ctx.quadraticCurveTo(-9, 22, 5, 29 + step);
    ctx.lineTo(10, -10);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(210,177,104,.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.quadraticCurveTo(-14, 13, -19, 22 + step);
    ctx.stroke();

    // Dark trousers.
    ctx.fillStyle = "#202944";
    ctx.fillRect(-9, 13, 7, 16 + step);
    ctx.fillRect(3, 13, 7, 16 - step);

    // Polished boots.
    ctx.fillStyle = "#c1c9db";
    ctx.fillRect(-12, 27 + step, 13, 5);
    ctx.fillRect(2, 27 - step, 13, 5);
    ctx.fillStyle = "#9d773c";
    ctx.fillRect(-12, 26 + step, 12, 2);
    ctx.fillRect(2, 26 - step, 12, 2);

    // Silver-blue chest armour.
    const metal = ctx.createLinearGradient(-14, -13, 13, 17);
    metal.addColorStop(0, "#f0f1f8");
    metal.addColorStop(.25, "#b6c6e4");
    metal.addColorStop(.55, "#7188b5");
    metal.addColorStop(1, "#29395f");

    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(-11, -13);
    ctx.lineTo(-15, -7);
    ctx.lineTo(-12, 12);
    ctx.lineTo(0, 18);
    ctx.lineTo(12, 12);
    ctx.lineTo(15, -7);
    ctx.lineTo(10, -13);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,239,194,.8)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Fine gold trim and royal crest.
    ctx.strokeStyle = "#e9c979";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(0, 1);
    ctx.lineTo(10, -4);
    ctx.stroke();

    ctx.fillStyle = "#f3d58a";
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 11);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();

    // Shoulder plates.
    ctx.fillStyle = "#dce4f4";
    ctx.beginPath();
    ctx.ellipse(-13, -8, 6, 7, -.2, 0, Math.PI * 2);
    ctx.ellipse(13, -8, 6, 7, .2, 0, Math.PI * 2);
    ctx.fill();

    // Neck.
    ctx.fillStyle = "#d9b49a";
    ctx.fillRect(-4, -22, 8, 9);

    // Face: mature young knight, not a cartoon helmet.
    ctx.fillStyle = "#e8c3a7";
    ctx.beginPath();
    ctx.ellipse(0, -28, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark swept-back hair.
    ctx.fillStyle = "#171a2a";
    ctx.beginPath();
    ctx.moveTo(-11, -29);
    ctx.quadraticCurveTo(-13, -44, 1, -43);
    ctx.quadraticCurveTo(12, -42, 11, -29);
    ctx.lineTo(7, -34);
    ctx.quadraticCurveTo(0, -29, -6, -34);
    ctx.lineTo(-9, -25);
    ctx.closePath();
    ctx.fill();

    // Side hair and neat fringe.
    ctx.fillStyle = "#25263a";
    ctx.beginPath();
    ctx.moveTo(-10, -33);
    ctx.quadraticCurveTo(-3, -40, 5, -34);
    ctx.lineTo(1, -30);
    ctx.lineTo(-5, -31);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-10, -31, 3, 9);

    // Brow and eye, facing forward.
    ctx.strokeStyle = "#4a2c29";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1, -29);
    ctx.lineTo(7, -29);
    ctx.stroke();

    ctx.fillStyle = "#28384c";
    ctx.beginPath();
    ctx.ellipse(5, -27, 2.2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose and restrained smile.
    ctx.strokeStyle = "#bb8b75";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7, -26);
    ctx.lineTo(8, -23);
    ctx.stroke();

    ctx.strokeStyle = "#9d625a";
    ctx.beginPath();
    ctx.moveTo(3, -20);
    ctx.quadraticCurveTo(6, -18, 9, -20);
    ctx.stroke();

    // Small elegant circlet.
    ctx.strokeStyle = "#f2d28a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -36);
    ctx.lineTo(-4, -38);
    ctx.lineTo(0, -35);
    ctx.lineTo(4, -38);
    ctx.lineTo(8, -36);
    ctx.stroke();

    // Blade.
    ctx.strokeStyle = "#f1f4ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(13, -2);
    ctx.lineTo(24, -20);
    ctx.stroke();
    ctx.strokeStyle = "#e5c678";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(17, 0);
    ctx.stroke();

    ctx.restore();
  }

  // ---------- DRAGON ART & FIRE ----------

  function drawDragon() {
    const d = s.dragon;
    const x = d.x - s.camera * .72;
    const y = d.y;
    if (x < -200 || x > W + 200) return;

    const wing = Math.sin(d.wing) * 15;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(d.direction, 1);

    // Tail.
    ctx.strokeStyle = "#493c70";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-48, 12);
    ctx.quadraticCurveTo(-85, 26, -110, 3);
    ctx.lineTo(-126, -1);
    ctx.stroke();

    // Rear wing, dark membrane.
    ctx.fillStyle = "#34264e";
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(-55, -48 - wing);
    ctx.lineTo(-15, -31);
    ctx.lineTo(9, -65 - wing);
    ctx.lineTo(15, -9);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#86669e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Body, elegant deep indigo scales.
    const body = ctx.createLinearGradient(-40, -15, 30, 25);
    body.addColorStop(0, "#7b628f");
    body.addColorStop(.45, "#42345f");
    body.addColorStop(1, "#211f43");

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 5, 47, 23, -.05, 0, Math.PI * 2);
    ctx.fill();

    // Chest scales.
    ctx.strokeStyle = "rgba(220,184,124,.65)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-7 + i * 8, 15);
      ctx.lineTo(-3 + i * 8, 21);
      ctx.lineTo(1 + i * 8, 15);
      ctx.stroke();
    }

    // Front wing.
    ctx.fillStyle = "#59436f";
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-32, -55 + wing);
    ctx.lineTo(9, -36);
    ctx.lineTo(37, -56 - wing);
    ctx.lineTo(27, -8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#a17da8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Neck and head.
    ctx.strokeStyle = "#57416e";
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(27, 2);
    ctx.quadraticCurveTo(42, -10, 46, -23);
    ctx.stroke();

    ctx.fillStyle = "#6e5884";
    ctx.beginPath();
    ctx.ellipse(48, -25, 19, 13, -.15, 0, Math.PI * 2);
    ctx.fill();

    // Crown-like horns.
    ctx.fillStyle = "#c4a36b";
    ctx.beginPath();
    ctx.moveTo(39, -33);
    ctx.lineTo(34, -47);
    ctx.lineTo(46, -36);
    ctx.lineTo(52, -49);
    ctx.lineTo(55, -32);
    ctx.closePath();
    ctx.fill();

    // Snout.
    ctx.fillStyle = "#89719a";
    ctx.beginPath();
    ctx.moveTo(55, -24);
    ctx.lineTo(75, -19);
    ctx.lineTo(66, -10);
    ctx.lineTo(49, -14);
    ctx.closePath();
    ctx.fill();

    // Eye.
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffb75f";
    ctx.fillStyle = "#ffd48a";
    ctx.beginPath();
    ctx.ellipse(53, -27, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Breath glow before flame.
    if (d.phase === "warning") {
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff8a3d";
      ctx.fillStyle = "#ffb35d";
      ctx.beginPath();
      ctx.arc(73, -14, 7 + Math.sin(s.time * 22) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    
    // ---------- ENHANCED DRAGON FIRE ----------

    if (d.phase === "fire") {
      const progress = Math.min(1, 1 - d.fireTime / 0.85);

      // Dragon's mouth and the target on the ground.
      const dragonX = d.x - s.camera * 0.72;
      const dragonY = d.y;
      const mouthX = dragonX + d.direction * 70;
      const mouthY = dragonY - 16;
      const targetX = d.fireX - s.camera;

      // The fire grows in, then fades out.
      const intensity = Math.sin(Math.PI * Math.min(1, progress * 1.12));
      const spread = 26 + intensity * 30;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Main plume: layered gold, scarlet and violet-red fire.
      const plume = ctx.createLinearGradient(
        mouthX, mouthY, targetX, 610
      );

      plume.addColorStop(0, "#fffde0");
      plume.addColorStop(0.12, "#fff0a0");
      plume.addColorStop(0.30, "#ffc34e");
      plume.addColorStop(0.52, "#ff713d");
      plume.addColorStop(0.76, "#ed3157");
      plume.addColorStop(1, "rgba(117,38,167,0.08)");

      ctx.globalAlpha = Math.min(1, 0.45 + intensity * 0.75);
      ctx.fillStyle = plume;
      ctx.shadowBlur = 32;
      ctx.shadowColor = "#ff713d";

      ctx.beginPath();
      ctx.moveTo(mouthX, mouthY);

      ctx.bezierCurveTo(
        mouthX + d.direction * 25, mouthY + 75,
        targetX - spread * 1.5, 350,
        targetX - spread, 470
      );

      ctx.quadraticCurveTo(
        targetX - spread * 1.8, 545,
        targetX, 610
      );

      ctx.quadraticCurveTo(
        targetX + spread * 1.8, 545,
        targetX + spread, 470
      );

      ctx.bezierCurveTo(
        targetX + spread * 1.5, 350,
        mouthX - d.direction * 25, mouthY + 75,
        mouthX, mouthY
      );

      ctx.closePath();
      ctx.fill();

      // Bright inner stream, connecting the mouth to the impact point.
      const core = ctx.createLinearGradient(
        mouthX, mouthY, targetX, 600
      );

      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.25, "#fff8cb");
      core.addColorStop(0.55, "#ffe17a");
      core.addColorStop(1, "rgba(255,164,57,0.05)");

      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = core;
      ctx.lineWidth = 8 + intensity * 8;
      ctx.shadowBlur = 22;
      ctx.shadowColor = "#fff0a0";

      ctx.beginPath();
      ctx.moveTo(mouthX, mouthY + 5);
      ctx.bezierCurveTo(
        mouthX + d.direction * 20, mouthY + 90,
        targetX - 22, 390,
        targetX, 600
      );
      ctx.stroke();

      // Separate, flickering tongues of fire.
      ctx.shadowBlur = 13;

      for (let i = 0; i < 7; i++) {
        const sway = Math.sin(s.time * 17 + i * 2.2) * 24;
        const startX = mouthX + d.direction * (i * 2);
        const endX = targetX + sway;
        const bendX = startX + (endX - startX) * 0.55;
        const tipY = 370 + (i % 3) * 42;

        ctx.globalAlpha = 0.48 + intensity * 0.4;
        ctx.strokeStyle = [
          "#fff2a6",
          "#ffd15f",
          "#ff9744",
          "#ff5361"
        ][i % 4];

        ctx.lineWidth = 3 + (i % 3) * 2;
        ctx.beginPath();
        ctx.moveTo(startX, mouthY + 10);
        ctx.quadraticCurveTo(
          bendX + sway, tipY,
          endX, 580 + (i % 2) * 20
        );
        ctx.stroke();
      }

      // Sparks and embers travelling through the fire.
      for (let i = 0; i < 34; i++) {
        const travel = (
          s.time * (1.2 + (i % 5) * 0.16) + i * 0.137
        ) % 1;

        const emberX =
          mouthX + (targetX - mouthX) * travel +
          Math.sin(s.time * 13 + i * 1.7) * (8 + travel * 26);

        const emberY =
          mouthY + (590 - mouthY) * travel -
          Math.sin(travel * Math.PI) * (35 + (i % 5) * 18);

        const emberSize = 1.5 + (i % 4) * 0.65;

        ctx.globalAlpha = (1 - travel * 0.65) * (0.55 + intensity * 0.4);
        ctx.fillStyle = i % 4 === 0 ? "#fffbd8"
          : i % 3 === 0 ? "#ff5261" : "#ffca62";

        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;

        ctx.beginPath();
        ctx.arc(emberX, emberY, emberSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing impact flare at the target.
      ctx.globalAlpha = 0.18 + intensity * 0.35;
      ctx.fillStyle = "#ff713d";
      ctx.shadowBlur = 35;
      ctx.shadowColor = "#ff553f";

      ctx.beginPath();
      ctx.ellipse(
        targetX, 600,
        30 + intensity * 38,
        9 + intensity * 8,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    }


    // Clear danger marker while the dragon is preparing to breathe.
    if (d.phase === "warning") {
      const fx = d.fireX - s.camera;
      const pulse = .5 + .5 * Math.sin(s.time * 24);
      ctx.fillStyle = `rgba(255,60,65,${.1 + pulse * .12})`;
      ctx.fillRect(fx - 85, 0, 170, H);

      ctx.strokeStyle = `rgba(255,95,94,${.45 + pulse * .5})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(fx - 85, 585);
      ctx.lineTo(fx + 85, 585);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ffd0ad";
      ctx.font = "700 12px Inter";
      ctx.textAlign = "center";
      ctx.fillText("DANGER — MOVE!", fx, 560);
    }
  }

  function drawGate() {
    const x = 1920 - s.camera;
    ctx.save();
    ctx.translate(x, 520);

    ctx.shadowBlur = s.finaleReady ? 45 : 20;
    ctx.shadowColor = s.finaleReady ? "#ffe5a1" : "#e8d4ff";
    ctx.strokeStyle = "#cbb6f3";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-44, 100);
    ctx.lineTo(-44, -35);
    ctx.quadraticCurveTo(0, -100, 44, -35);
    ctx.lineTo(44, 100);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = s.finaleReady ? "rgba(255,220,135,.6)" : "rgba(148,134,255,.16)";
    ctx.beginPath();
    ctx.moveTo(-36, 100);
    ctx.lineTo(-36, -30);
    ctx.quadraticCurveTo(0, -82, 36, -30);
    ctx.lineTo(36, 100);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff0b8";
    ctx.font = "700 12px Cinzel, serif";
    ctx.textAlign = "center";
    ctx.fillText(s.finaleReady ? "ENTER THE CELESTIAL GATE" : "CROWN GATE", 0, 122);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of s.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color === "gold" ? "#ffe8a0"
        : p.color === "blue" ? "#9bc8ff" : "#cfb2ff";
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(p.x - s.camera, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Always-visible in-world objective panel: no scrolling back to the HUD.
  function drawPinnedObjective() {
    const n = challenges[Math.min(s.index, 11)].n;

    ctx.save();
    ctx.fillStyle = "rgba(7,10,29,.87)";
    ctx.strokeStyle = "rgba(238,211,142,.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(18, 52, 300, 84, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e6cb88";
    ctx.font = "700 10px Inter";
    ctx.textAlign = "left";
    ctx.fillText("CURRENT ROYAL SEAL", 34, 72);

    ctx.fillStyle = "#fff0b8";
    ctx.font = "700 26px Cinzel, serif";
    ctx.fillText(`x² = ${n}`, 34, 101);

    ctx.fillStyle = "#cbd5f2";
    ctx.font = "11px Inter";
    ctx.fillText("Find both solutions · E / ENTER to activate", 34, 121);

    // Compact progress and lives, visible even while moving.
    ctx.fillStyle = "rgba(7,10,29,.8)";
    ctx.beginPath();
    ctx.roundRect(W - 206, 18, 188, 36, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(207,207,255,.24)";
    ctx.stroke();

    ctx.fillStyle = "#ff9db7";
    ctx.font = "700 13px Inter";
    ctx.fillText("♥ ".repeat(s.lives) + "♡ ".repeat(MAX_LIVES - s.lives), W - 194, 40);

    ctx.fillStyle = "#fff0b8";
    ctx.textAlign = "right";
    ctx.font = "700 12px Inter";
    ctx.fillText(`${s.xp} XP`, W - 24, 78);

    ctx.fillStyle = "#cbd5f2";
    ctx.font = "10px Inter";
    ctx.fillText(`SEAL ${Math.min(s.index + 1, 12)} / 12`, W - 24, 96);
    ctx.restore();
  }

  function drawWorld() {
    ctx.save();

    if (s.shake > 0) {
      ctx.translate((Math.random() - .5) * s.shake,
                    (Math.random() - .5) * s.shake);
    }

    if (s.cinematic) {
      // The independent cinematic draws on its own overlay canvas.
      ctx.restore();
      return;
    }
    drawBackground();
    drawBridge();

    for (const platform of s.platforms) drawPlatform(platform);

    drawAltar();
    for (const rune of s.runes) drawRune(rune);

    drawGate();
    drawDragon();
    drawKnight();
    drawParticles();

    const target = getTarget();
    if (target && s.running && s.clearTime <= 0) {
      const x = (target.kind === "altar" ? target.item.x : target.item.x) - s.camera;
      const y = target.kind === "altar" ? target.item.y - 58 : target.item.y - 51;

      ctx.fillStyle = "rgba(7,10,27,.9)";
      ctx.beginPath();
      ctx.roundRect(x - 65, y - 16, 130, 27, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,233,166,.55)";
      ctx.stroke();

      ctx.fillStyle = "#fff0b8";
      ctx.font = "700 11px Inter";
      ctx.textAlign = "center";
      ctx.fillText(
        target.kind === "altar"
          ? "ENTER / E · AWAKEN CORE"
          : "ENTER / E · ACTIVATE RUNE",
        x,
        y + 1
      );
    }

    // Fixed overlay is drawn last so the objective stays readable.
    drawPinnedObjective();

    if (s.flash > 0) {
      ctx.fillStyle = `rgba(205,221,255,${s.flash * .5})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }


  // ---------- CANVAS CINEMATIC: KNIGHT & DRAGON ----------
  // This uses the real AuriliaCinematic Canvas animation bundled below.
  // No cinematic-01.webp ... cinematic-06.webp assets are required.
  let cinematicRunId = 0;

  function startCinematic() {
    if (s.cinematic || s.ended || !s.running) return;
    const runId = ++cinematicRunId;
    s.cinematic = { playing: true };
    s.keys = {};
    stopBackgroundMusic();
    playCinematicMusic();
    sound("bridge");
    ui.toast.classList.remove("visible");
    ui.message.textContent = "THE DRAGON'S ALLEGIANCE — A NEW DESTINY AWAKENS";

    if (!window.AuriliaCinematic?.start) {
      console.error("Aurilia Canvas cinematic is not available.");
      s.cinematic = null;
      endGame(true);
      return;
    }

    Promise.resolve().then(() => window.AuriliaCinematic.start())
      .catch(error => console.error("Aurilia cinematic failed:", error))
      .finally(() => {
        if (runId !== cinematicRunId || s.ended || !s.running) return;

        stopCinematicMusic();

        s.cinematic = null;
        endGame(true);
      });
  }

  // ---------- LOOP & ENDINGS ----------

  function update(dt) {
    if (!s.running || s.ended) return;
    if (s.cinematic) return; // Canvas cinematic owns the animation until it resolves.

    s.time += dt;
    movePlayer(dt);
    if (s.ended) return;

    updateDragon(dt);

    s.altar.pulse += dt * 2.5;
    s.shake = Math.max(0, s.shake - dt * 28);
    s.flash = Math.max(0, s.flash - dt);
    s.toastTime -= dt;

    if (s.toastTime <= 0) ui.toast.classList.remove("visible");

    for (const rune of s.runes) {
      rune.pulse += dt * 3;
      rune.wrongTime = Math.max(0, rune.wrongTime - dt);
    }

    for (const p of s.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += .08;
      p.life -= dt * 1.2;
    }
    s.particles = s.particles.filter(p => p.life > 0);

    const targetCamera = Math.max(0, Math.min(WORLD - W, s.player.x - W * .38));
    s.camera += (targetCamera - s.camera) * Math.min(1, dt * 5);

    if (s.bridge.active) s.bridge.progress = Math.min(1, s.bridge.progress + dt * .6);

    if (s.clearTime > 0) {
      s.clearTime -= dt;
      if (s.clearTime <= 0) {
        s.clearTime = 0;
        if (s.seals === challenges.length) {
          s.finaleReady = true;
          s.dragon.phase = "fly";
          s.dragon.timer = 99999;
          toast("THE CROWN GATE IS OPEN — GO RIGHT!", 3);
        } else nextChallenge();
      }
    }

    if (s.finaleReady && s.player.x > 1840) startCinematic();
  }
  
  function endGame(victory) {
    if (s.ended) return;

    s.running = false;
    s.ended = true;
    stopBackgroundMusic(true);
    stopCinematicMusic();
    
    // Simpan XP percubaan terbaru, menang atau kalah.
    window.AuriliaKnight?.recordTrialResult("game03", s.xp, victory);

    ui.end.classList.remove("hidden");
    ui.finalXP.textContent = s.xp;
    ui.finalSeals.textContent = `${s.seals} / 12`;

    const playerName = getPlayerName();

    if (victory) {

      ui.endingTitle.textContent =
        "THE DRAGON HAS BEEN TAMED";

      ui.endingCopy.textContent = s.flawless
        ? `${playerName}, you restored all twelve seals without losing a life. The dragon now flies beside you as a loyal ally. Your journey through Aurilia continues!`
        : `${playerName}, the twelve seals are restored. The dragon has accepted you as its rider, and the skies of Aurilia are yours to explore!`;

      ui.restartButton.textContent = "PLAY AGAIN";

      sound("victory");

      // Launch the epilogue once all four trials are completed.
      // Allow the Game 3 victory screen to remain for 6 seconds.
      if (window.AuriliaKnight?.isCampaignComplete()) {
        setTimeout(() => {
          window.AuriliaKnight.checkAndLaunchEpilogue();
        }, 1000);
      }
    } else {

      ui.endingTitle.textContent =
        "The Citadel Falls Silent";

      ui.endingCopy.textContent =
        `The storm overwhelmed you. You restored ${s.seals} of 12 mechanisms and earned ${s.xp} XP. Learn from the runes and try again.`;

      ui.restartButton.textContent = "TRY AGAIN";
    }
  }

  function startGame() {
    ++cinematicRunId;
    window.AuriliaCinematic?.stop?.();
    stopCinematicMusic();
    initAudio();
    s.running = true;
    s.ended = false;
    stopBackgroundMusic(true);
    playBackgroundMusic();
    s.index = 0;
    s.cinematic = null;
    s.finaleReady = false;

        // Generate a new question and rune order on every attempt.
        challenges = generateChallenges();

    s.xp = 0;
    s.lives = MAX_LIVES;
    s.seals = 0;
    s.flawless = true;
    s.time = 0;
    s.toastTime = 0;

    ui.start.classList.add("hidden");
    ui.end.classList.add("hidden");
    ui.toast.classList.remove("visible");

    buildWorld();
    toast(
      `${getPlayerName()}, the Star Core awaits. Watch the skies for the dragon.`,
      3
    );
  }

  function frame(timestamp) {
    if (!s.last) s.last = timestamp;
    const dt = Math.min(.032, (timestamp - s.last) / 1000);
    s.last = timestamp;
    update(dt);
    drawWorld();
    requestAnimationFrame(frame);
  }

  // ---------- INPUT ----------

  window.addEventListener("keydown", event => {
  const key = event.code;

  const gameControls = [
    "Space",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight"
  ];

  if (gameControls.includes(key)) {
    event.preventDefault();
  }

  s.keys[key] = true;

  // ENTER or E to interact with runes and the Star Core.
  if (
    s.running &&
    !s.ended &&
    !event.repeat &&
    (key === "KeyE" || key === "Enter")
  ) {
    event.preventDefault();
    interact();
  }
});

  window.addEventListener("keyup", event => {
    s.keys[event.code] = false;
  });

  window.addEventListener("blur", () => {
    s.keys = {};
  });
  
  ui.startButton.addEventListener("click", startGame);
  ui.restartButton.addEventListener("click", startGame);

  // ENTER to start or replay the game.
  // During gameplay, ENTER remains the interaction key.
  window.addEventListener("keydown", event => {
    if (event.code !== "Enter" || event.repeat) return;

    if (!ui.start.classList.contains("hidden")) {
      event.preventDefault();

      // Avoid triggering twice if a button has focus.
      if (document.activeElement === ui.startButton) return;

      startGame();
      return;
    }

    if (!ui.end.classList.contains("hidden")) {
      event.preventDefault();

      if (document.activeElement === ui.restartButton) return;

      startGame();
    }
  });

  createStars();
  buildWorld();
  requestAnimationFrame(frame);
})();

/* Bundled original Knight & Dragon Canvas cinematic — no image files needed. */
/* AURILIA / STARFALL CITADEL — PURE CANVAS CINEMATIC
   No images, models, CSS files, libraries, network calls or dependencies.
   API: window.AuriliaCinematic.start() -> Promise; .stop()
*/
(() => {
  'use strict';
  let current = null;
  const TAU = Math.PI * 2;
  const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease = v=>{v=clamp(v);return v*v*(3-2*v);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const rgba=(r,g,b,a)=>`rgba(${r},${g},${b},${a})`;
  const DURATION=28;
  function path(ctx,pts,fill,stroke=null,lw=1){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
  function line(ctx,pts,color,width=1){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function ellipse(ctx,x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=color;ctx.fill();}
  function glow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function star(ctx,x,y,r,a){ctx.save();ctx.globalAlpha=a;glow(ctx,x,y,r*6,'rgba(196,211,255,.25)');ctx.strokeStyle='#f7e8cb';ctx.lineWidth=Math.max(.6,r*.28);line(ctx,[[x-r*2,y],[x+r*2,y]],'#f4e9d7',Math.max(.6,r*.3));line(ctx,[[x,y-r*2],[x,y+r*2]],'#f4e9d7',Math.max(.6,r*.3));ctx.restore();}
  function dragon(ctx,x,y,s,{bow=0,wing=0,flight=false,breath=0}={}){
    ctx.save();ctx.translate(x,y);ctx.scale(-s,s);
    // Tail with smooth tapered segments
    ctx.save();ctx.translate(-132,16);ctx.rotate(Math.sin(wing*.4)*.07);
    path(ctx,[[0,0],[-63,7],[-125,-14],[-180,-9],[-228,21],[-201,7],[-174,10],[-123,8],[-56,23]],'#182238','#62718b',1.5);
    for(let i=0;i<5;i++)path(ctx,[[-55-i*27,3-i*1.2],[-63-i*27,-12-i*2],[-72-i*27,4-i*1.2]],'#6e7995');ctx.restore();
    // Far wing
    ctx.save();ctx.translate(-52,-31);ctx.rotate(-.08+Math.sin(wing)*.25);
    path(ctx,[[0,0],[-75,-126],[-178,-204],[-148,-116],[-206,-111],[-157,-64],[-170,-22],[-75,-40]],'#24334e','#a39caa',2);
    line(ctx,[[0,0],[-75,-126],[-178,-204]],'#7b7e98',3);
    ctx.restore();
    // Back legs
    path(ctx,[[-96,19],[-126,66],[-125,89],[-155,95],[-137,100],[-111,99],[-92,66],[-68,35]],'#1d2a40','#69758d',2);
    path(ctx,[[57,19],[38,76],[60,94],[91,94],[70,103],[29,104],[11,72],[12,20]],'#24334b','#7b8398',2);
    // Body
    ellipse(ctx,-20,4,145,59,'#26334c');
    path(ctx,[[-130,6],[-98,35],[-33,53],[59,39],[119,14],[78,51],[-12,65],[-98,48]],'#34435a');
    for(let i=0;i<7;i++){const px=-108+i*31;path(ctx,[[px,-36],[px+11,-68-(i%3)*7],[px+21,-33]],'#6d7893','#a0a4ad',1);}
    // Layered scales along the shoulder and flank, fixed in body coordinates.
    ctx.save();ctx.globalAlpha=.62;
    for(let row=0;row<3;row++)for(let i=0;i<9;i++){
      const px=-117+i*24+(row%2)*11,py=-18+row*19;
      ctx.beginPath();ctx.ellipse(px,py,9,4.2,-.12,0,Math.PI);
      ctx.strokeStyle=row===0?'#9babc5':'#6b809e';ctx.lineWidth=1.35;ctx.stroke();
    }
    ctx.restore();
    // Reflected moonlight over the dragon's upper back.
    line(ctx,[[-124,-18],[-84,-43],[-28,-51],[35,-39],[78,-17]],'rgba(181,202,232,.45)',2.3);
    // Near wing - animated around shoulder
    ctx.save();ctx.translate(-17,-34);ctx.rotate(flight?(-.12+Math.sin(wing)*.37):(-.12+Math.sin(wing)*.055));
    path(ctx,[[0,0],[-45,-110],[-132,-224],[-129,-140],[-197,-167],[-173,-102],[-227,-90],[-159,-53],[-185,-7],[-93,-30]],'#34425e','#a3a2b1',2.5);
    path(ctx,[[-45,-110],[-132,-224],[-129,-140],[-197,-167],[-173,-102],[-227,-90],[-159,-53]],'rgba(126,112,166,.24)');
    line(ctx,[[0,0],[-45,-110],[-132,-224]],'#a4a0a8',4);
    line(ctx,[[-45,-110],[-129,-140]],'#66758e',2);
    line(ctx,[[-45,-110],[-173,-102]],'#66758e',2);
    // Membrane veins and silver-blue edge glints.
    line(ctx,[[-46,-109],[-196,-165]],'rgba(183,196,226,.42)',1.3);
    line(ctx,[[-46,-109],[-226,-90]],'rgba(183,196,226,.34)',1.3);
    ctx.restore();
    // Neck and head are lowered by changing anatomical geometry, not whole-dragon tilt
    const hx=186-bow*14,hy=-62+bow*96;
    path(ctx,[[65,-20],[95,-63+bow*24],[132,-102+bow*63],[hx-13,hy-16],[hx+7,hy+21],[133,-54+bow*51],[102,10],[58,23]],'#28384f','#8790a4',2.5);
    for(let i=0;i<5;i++){const a=i/5;const px=mix(91,hx-16,a),py=mix(-53+bow*28,hy-15,a);path(ctx,[[px-10,py-5],[px-6,py-25],[px+11,py-7]],'#7d849d');}
    ctx.save();ctx.translate(hx,hy);ctx.rotate(bow*.23);
    path(ctx,[[-23,-28],[18,-40],[58,-20],[84,-1],[68,18],[20,22],[-18,11]],'#35445d','#a5a8b1',2.3);
    path(ctx,[[13,16],[78,9],[64,25],[29,31]],'#202a3c','#777f93',1.5);
    path(ctx,[[3,-27],[13,-67],[34,-34]],'#79819b');path(ctx,[[35,-27],[52,-56],[60,-15]],'#7c829b');
    ellipse(ctx,38,-9,6,4,'#ffe2a0');ellipse(ctx,40,-9,2.3,2,'#fff');
    ellipse(ctx,75,1,3,2,'#101a2b');
    line(ctx,[[12,-22],[30,-25],[51,-13]],'rgba(205,221,246,.58)',1.7);
    for(let i=0;i<5;i++){
      const sx=-9+i*13,sy=-5+(i%2)*7;
      line(ctx,[[sx,sy],[sx+8,sy+3]],'rgba(153,178,209,.55)',1.1);
    }
    if(breath>0){glow(ctx,86,10,80*breath,`rgba(255,194,107,${.3*breath})`);}
    ctx.restore();
    // Chest detail and saddle, deliberately over torso for visible contact
    path(ctx,[[-38,-44],[-12,-55],[25,-47],[32,-31],[-48,-28]],'#6b513e','#b99a6d',2);
    line(ctx,[[-24,-39],[-30,41]],'#c6a77b',4);line(ctx,[[15,-39],[24,36]],'#c6a77b',4);
    line(ctx,[[-30,-48],[20,-44]],'#e4c895',1.8);
    for(let i=0;i<5;i++)ellipse(ctx,-25+i*11,-43,1.8,1.8,'#f6dca0');
    ctx.restore();
  }
  function knight(ctx,x,y,s,{walk=0,walking=false,sitting=false,face=1}={}){
    ctx.save();ctx.translate(x,y);ctx.scale(s*face,s);
    const stride=walking?Math.sin(walk*TAU)*.56:0;
    // Animated burgundy cape, more movement in flight than while walking.
    const capeWave=Math.sin(walk*.8)* (sitting?5:1.8);
    path(ctx,[[-10,-67],[-27,-49],[-35+capeWave,-7],[-12+capeWave*.6,-14],[6,-46]],'#4a304b','#b88999',1.5);
    line(ctx,[[-19,-50],[-23+capeWave*.6,-16]],'rgba(228,169,181,.5)',1.3);
    // legs pivot from hips, both foot contacts visually aligned with floor
    ctx.save();ctx.translate(-6,-31);ctx.rotate(sitting?-1.06:stride);
    path(ctx,[[-7,0],[6,0],[8,30],[13,33],[-5,34],[-10,28]],'#8996ac','#d6d8dc',1.2);ctx.restore();
    ctx.save();ctx.translate(7,-31);ctx.rotate(sitting?.83:-stride);
    path(ctx,[[-6,0],[7,0],[9,29],[14,33],[-5,34],[-10,28]],'#6b7c98','#c4cad5',1.2);ctx.restore();
    // torso armor
    path(ctx,[[-16,-69],[15,-70],[19,-34],[-15,-32]],'#a5b2c3','#e2d7bd',2);
    path(ctx,[[-13,-64],[0,-57],[13,-64],[10,-39],[0,-35],[-10,-39]],'#52647d','#d9b878',1.5);
    line(ctx,[[-12,-67],[-10,-43],[0,-38]],'rgba(245,244,238,.78)',1.3);
    ellipse(ctx,0,-48,2.8,2.8,'#f4d28a');
    // arms
    ctx.save();ctx.translate(-17,-64);ctx.rotate(walking?-stride*.55:0);path(ctx,[[-5,0],[5,0],[6,26],[-5,27]],'#8e9bb0','#e2d7bd',1.2);ctx.restore();
    ctx.save();ctx.translate(17,-64);ctx.rotate(walking?stride*.55:(sitting?-.55:0));path(ctx,[[-5,0],[5,0],[6,26],[-5,27]],'#8e9bb0','#e2d7bd',1.2);ctx.restore();
    // helmet and visor facing right
    ellipse(ctx,0,-84,15,17,'#b7bfcb');
    path(ctx,[[-14,-91],[2,-104],[13,-92],[15,-82],[-15,-82]],'#a5b4c9','#e7d6b4',1.3);
    path(ctx,[[1,-87],[16,-86],[17,-79],[0,-79]],'#17243b','#d8cba8',1);
    path(ctx,[[-5,-103],[1,-115],[7,-103]],'#c4a775');
    ctx.restore();
  }
  function background(ctx,w,h,t,travel,stars){
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#070c22');sky.addColorStop(.55,'#18223e');sky.addColorStop(1,'#413b56');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    glow(ctx,w*.76,h*.22,w*.37,'rgba(106,92,170,.22)');glow(ctx,w*.32,h*.56,w*.4,'rgba(77,104,169,.13)');
    for(const p of stars){const xx=(p.x-(travel*.015*p.depth))%w;star(ctx,(xx+w)%w,p.y,p.r,.45+.5*Math.sin(t*.6+p.phase)**2);}
    // moon
    glow(ctx,w*.78,h*.22,w*.16,'rgba(211,218,255,.12)');ellipse(ctx,w*.78,h*.22,w*.052,w*.052,'#cbd3e4');
    ellipse(ctx,w*.795,h*.209,w*.052,w*.052,'#111a34');
    // Slowly drifting cloud bands add depth without external assets.
    ctx.save();ctx.globalAlpha=.13;
    for(let i=0;i<7;i++){
      const cx=((i*277+t*(4+i%3)*3)%(w+420))-210;
      const cy=h*(.16+(i%4)*.115);
      ellipse(ctx,cx,cy,145+(i%3)*35,19+(i%2)*10,'#a6a6c4');
    }
    ctx.restore();
    // far castle silhouette with parallax
    ctx.save();ctx.translate(-travel*.055,0);
    for(let i=-1;i<9;i++){const x=i*200+35,top=h*.45+(i%3)*25;
      ctx.fillStyle='#111b31';ctx.fillRect(x,top,112,h-top);
      path(ctx,[[x-13,top],[x+56,top-58],[x+125,top]],'#141f36');
      // Gothic buttresses and narrow illuminated arrow-slits.
      path(ctx,[[x+7,top+17],[x+20,top+17],[x+20,h],[x-3,h]],'#17223b');
      path(ctx,[[x+89,top+17],[x+102,top+17],[x+115,h],[x+89,h]],'#17223b');
      line(ctx,[[x+7,top+14],[x+56,top-47],[x+105,top+14]],'rgba(145,153,183,.25)',1.5);
      for(let j=0;j<3;j++){ctx.fillStyle='#c6a46d';ctx.globalAlpha=.3;ctx.fillRect(x+20+j*30,top+55,8,18);ctx.globalAlpha=1;}
    }
    ctx.restore();
    // mountains
    path(ctx,[[0,h*.72],[w*.13,h*.54],[w*.24,h*.66],[w*.43,h*.5],[w*.58,h*.66],[w*.74,h*.53],[w,h*.72],[w,h]],'#151e35');
    path(ctx,[[0,h*.81],[w*.17,h*.69],[w*.36,h*.78],[w*.54,h*.64],[w*.72,h*.78],[w*.88,h*.68],[w,h*.79],[w,h]],'#1b243b');
    // Moving distant mist, kept behind the characters.
    ctx.save();ctx.globalAlpha=.07;
    for(let i=0;i<5;i++)ellipse(ctx,((i*390-t*12)%(w+460)+w+460)%(w+460)-170,h*.71+i*14,240,24,'#d0c8dc');
    ctx.restore();
    const fog=ctx.createLinearGradient(0,h*.62,0,h);fog.addColorStop(0,'rgba(140,138,179,0)');fog.addColorStop(1,'rgba(129,129,164,.13)');ctx.fillStyle=fog;ctx.fillRect(0,h*.62,w,h*.38);
  }
  function portal(ctx,x,y,r,t,alpha){
    ctx.save();ctx.globalAlpha=alpha;
    const pulse=1+.035*Math.sin(t*2.4);
    glow(ctx,x,y,r*2.55,`rgba(249,182,90,${.29*alpha})`);
    glow(ctx,x,y,r*1.55,`rgba(139,112,248,${.23*alpha})`);
    ctx.translate(x,y);ctx.scale(.78*pulse,1.13*pulse);
    // The vortex is drawn first, behind the decorative metalwork.
    const vortex=ctx.createRadialGradient(0,0,4,0,0,r*.93);
    vortex.addColorStop(0,'#d7c8f6');vortex.addColorStop(.28,'#8e83d2');
    vortex.addColorStop(.66,'#39376f');vortex.addColorStop(1,'#11152d');
    ctx.beginPath();ctx.arc(0,0,r*.91,0,TAU);ctx.fillStyle=vortex;ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(0,0,r*.88,0,TAU);ctx.clip();
    for(let i=0;i<16;i++){
      const a=i*TAU/16+t*(i%2?-.18:.22),rr=r*(.13+.042*i);
      ctx.beginPath();ctx.arc(0,0,rr,a,a+1.65);
      ctx.strokeStyle=i%2?'rgba(240,194,134,.30)':'rgba(198,201,255,.38)';
      ctx.lineWidth=2+i%3;ctx.stroke();
    }
    for(let i=0;i<36;i++){
      const a=i*2.39996+t*.16,rr=r*(.1+.7*((i*13%37)/37));
      ellipse(ctx,Math.cos(a)*rr,Math.sin(a)*rr,1.2+(i%3)*.6,1.2+(i%3)*.6,'#f6e0b7');
    }
    ctx.restore();
    // Carved concentric gold rings and violet enamel.
    for(let k=0;k<5;k++){
      ctx.beginPath();ctx.arc(0,0,r*(1.13-k*.062),0,TAU);
      ctx.strokeStyle=['#6c513b','#f4d99e','#9878a7','#d9ad68','#f6e3bb'][k];
      ctx.lineWidth=[10,4,5,3,2][k];ctx.shadowColor='#ffcc78';ctx.shadowBlur=k===1?16:0;ctx.stroke();
    }
    ctx.shadowBlur=0;
    // Arcane runes: individually drawn line glyphs, no font or assets required.
    for(let i=0;i<24;i++){
      const a=i*TAU/24+t*.025;
      ctx.save();ctx.rotate(a);ctx.translate(r*1.07,0);ctx.rotate(Math.PI/2);
      ctx.strokeStyle=i%3===0?'#fff0c4':'#d7b57e';ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(-4,-5);ctx.lineTo(0,5);ctx.lineTo(4,-5);
      if(i%2===0){ctx.moveTo(-4,0);ctx.lineTo(4,0);}else{ctx.moveTo(0,-5);ctx.lineTo(0,7);}
      ctx.stroke();ctx.restore();
    }
    for(let i=0;i<30;i++){
      const a=i*TAU/30+t*.18,rr=r*(1.25+.08*Math.sin(t*1.4+i));
      ellipse(ctx,Math.cos(a)*rr,Math.sin(a)*rr,1.5+i%3,1.5+i%3,'#ffdf9c');
    }
    ctx.restore();
  }
  function title(ctx,w,h,t,scene){const names=[['THE GUARDIAN DESCENDS','The Citadel answers the final seal.'],['THE DRAGON’S ALLEGIANCE','A guardian bows before the Royal Knight.'],['A ROYAL ALLIANCE','Trust is forged beneath the stars.'],['RISE, GUARDIAN','Two destinies become one.'],['BEYOND THE CELESTIAL GATE','Aurilia remembers its heroes.']];const item=names[scene];const fade=ease(Math.min(t%5,1))*ease(Math.min((28-t),1));ctx.save();ctx.globalAlpha=fade;ctx.textAlign='center';ctx.shadowColor='#050915';ctx.shadowBlur=14;ctx.fillStyle='#eed4a1';ctx.font='600 15px Georgia,serif';ctx.fillText(item[0],w/2,h-82);ctx.fillStyle='#e2e4f2';ctx.font='16px Georgia,serif';ctx.fillText(item[1],w/2,h-51);ctx.restore();}
  function render(ctx,w,h,t,stars){
    const scene=t<5?0:t<10?1:t<15?2:t<20?3:4;
    const flight=ease((t-14.3)/2.6),travel=flight*Math.max(0,t-14)*180;
    background(ctx,w,h,t,travel,stars);
    // The gate is hidden until the dragon has been flying for several seconds.
    const gateX=w*.24,gateY=h*.36;
    const gateReveal=ease((t-19.2)/2.3);
    if(gateReveal>0) portal(ctx,gateX,gateY,118,t,gateReveal);
    ctx.save();
    // platform is not visible after launch
    const groundAlpha=1-ease((t-14.4)/2.2);ctx.globalAlpha=groundAlpha;
    path(ctx,[[0,h*.77],[w,h*.77],[w,h],[0,h]],'#252c40');
    line(ctx,[[0,h*.77],[w,h*.77]],'#9c866a',3);
    for(let i=0;i<13;i++){const x=i*112;line(ctx,[[x,h*.77],[x-35,h]],'rgba(165,148,129,.2)',1.4);}
    for(let i=0;i<5;i++)line(ctx,[[0,h*(.8+i*.045)],[w,h*(.8+i*.045)]],'rgba(151,146,164,.15)',1);
    ctx.restore();
    // First the dragon bows to the knight; later both travel LEFT into the gate.
    const approach=ease(t/4.2);
    const bow=ease((t-4.4)/2.3)*(1-ease((t-10.2)/2.4));
    const launch=ease((t-14.3)/2.6);
    const towardGate=ease((t-19.7)/6.1);
    const entering=ease((t-24.0)/2.6);
    const dx=mix(mix(w*.94,w*.65,approach),gateX+45,towardGate)
             +Math.sin(t*1.2)*launch*(1-entering)*4;
    const dy=mix(h*.67,h*.39,launch);
    const ds=mix(.68,.9,approach)*(1-.94*entering);
    const wing=t<13?Math.sin(t*.7):t*5.3;
    // Knight approaches facing RIGHT, then faces LEFT on the saddle.
    const walking=t>=4.5&&t<9.1;
    const kp=ease((t-4.5)/4.6);
    const kx=mix(w*.22,w*.47,kp),ky=h*.77;
    const mount=ease((t-10.1)/3.0);
    const riderX=dx+22*ds,riderY=dy-48*ds;
    const knightX=mix(kx,riderX,mount),knightY=mix(ky,riderY,mount);
    // Both characters disappear together inside the gate, not offscreen.
    const vanish=1-ease((t-26.1)/.5);
    ctx.save();ctx.globalAlpha=vanish;
    dragon(ctx,dx,dy,ds,{bow,wing,flight:launch>.05,breath:ease((t-3)/1)*(1-ease((t-5)/1))});
    ctx.save();ctx.globalAlpha=groundAlpha*.28;
    ellipse(ctx,dx,h*.77+5,125,13,'#040816');ctx.restore();
    knight(ctx,knightX,knightY,mix(1.13,.72*ds,mount),{
      walk:(t-4.5)*1.35,walking,sitting:mount>.4,
      face:mount>.8?-1:1
    });
    ctx.restore();
    // A foreground ring makes it clear they pass THROUGH the portal.
    if(gateReveal>0){
      ctx.save();ctx.globalAlpha=gateReveal;
      ctx.beginPath();ctx.ellipse(gateX,gateY,118*.78,118*1.13,0,-Math.PI*.52,Math.PI*.52);
      ctx.strokeStyle='#ffe1a0';ctx.shadowColor='#e9a95f';ctx.shadowBlur=24;
      ctx.lineWidth=10;ctx.stroke();ctx.restore();
    }
    // luminous flight particles, deterministic (no flicker)
    if(t>14){for(let i=0;i<38;i++){const a=i*2.3999;const phase=(t*130+i*83)%w;const px=(dx-70-phase+w*2)%(w*1.4)-w*.2;const py=dy+Math.sin(a)*55+Math.sin(t+i)*8;ctx.save();ctx.globalAlpha=.15+.5*(i%5)/5;ellipse(ctx,px,py,1.2+i%3,1.2+i%3,'#f9d9a3');ctx.restore();}}
    // The portal illuminates nearby air only once revealed.
    if(gateReveal>0){
      ctx.save();ctx.globalAlpha=gateReveal*.26;
      glow(ctx,gateX,gateY,270,'rgba(250,193,117,.55)');ctx.restore();
    }
    if(t>26.3){ctx.fillStyle=`rgba(255,237,204,${ease((t-26.3)/1.7)})`;ctx.fillRect(0,0,w,h);}
    title(ctx,w,h,t,scene);
    // cinematic letterbox
    ctx.fillStyle='#070a14';ctx.fillRect(0,0,w,30);ctx.fillRect(0,h-27,w,27);
    // vignette
    const vignette=ctx.createRadialGradient(w/2,h/2,w*.16,w/2,h/2,w*.77);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.47)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function start(){
    if(current)return current.promise;
    const host=document.getElementById('world-frame')||document.body;
    const oldPosition=host.style.position;
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    const layer=document.createElement('div');layer.setAttribute('aria-label','Aurilia cinematic');
    layer.style.cssText='position:absolute;inset:0;z-index:9999;background:#080c1d;overflow:hidden;isolation:isolate;';
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;canvas.style.cssText='width:100%;height:100%;object-fit:contain;display:block;background:#080c1d;';layer.appendChild(canvas);
    const skip=document.createElement('button');skip.type='button';skip.textContent='SKIP CINEMATIC →';skip.style.cssText='position:absolute;right:20px;top:17px;z-index:5;background:rgba(8,12,26,.8);color:#ead3a3;border:1px solid #b89b6a;border-radius:4px;padding:10px 15px;cursor:pointer;letter-spacing:1.3px;font:12px Georgia,serif;';layer.appendChild(skip);
    host.appendChild(layer);
    const ctx=canvas.getContext('2d');if(!ctx){layer.remove();host.style.position=oldPosition;return Promise.resolve();}
    const stars=Array.from({length:100},(_,i)=>({x:((i*7879+123)%1280),y:((i*3391+81)%500),r:.5+(i%4)*.37,phase:i*1.7,depth:1+i%4}));
    let raf=0,done=false,last=0,time=0,resolvePromise;
    const promise=new Promise(resolve=>resolvePromise=resolve);
    function finish(){if(done)return;done=true;cancelAnimationFrame(raf);skip.removeEventListener('click',finish);layer.remove();host.style.position=oldPosition;current=null;resolvePromise();}
    function tick(now){if(done)return;if(!last)last=now;time+=Math.min((now-last)/1000,.05);last=now;render(ctx,1280,720,time,stars);if(time>=DURATION){finish();return;}raf=requestAnimationFrame(tick);}
    skip.addEventListener('click',finish);current={promise,stop:finish};raf=requestAnimationFrame(tick);return promise;
  }
  window.AuriliaCinematic={start,stop:()=>current?.stop()};
})();

