

(() => {

  "use strict";

  const $ = selector =>

    document.querySelector(selector);

  const $$ = selector =>

    [...document.querySelectorAll(selector)];

  const scenes = $$(".scene");

  const knight = window.AuriliaKnight;

  const state = {

    sceneVersion: 0,

    soundOn: (() => { try { return localStorage.getItem("aurilia.sound.enabled") !== "false"; } catch { return true; } })(),

    audio: null,

    dialogueStep: 0,

    trialIndex: 0,

    seals: 0,

    trialAnswered: false,

    trialComplete: false,

    toastTimer: null,

    currentScene: "opening",

    route: null

  };

  const trialQuestions = [

    {

      title: "Restore the first seal",

      question: "Which number is a perfect square?",

      answers: ["18", "25", "30", "42"],

      correct: "25",

      explain:

        "Correct. 25 = 5², so 25 is a perfect square."

    },

    {

      title: "Restore the second seal",

      question:

        "Which statement about square roots is correct?",

      answers: [

        "√36 = 6 only",

        "√36 = −6 only",

        "The square roots of 36 are 6 and −6",

        "36 has no square root"

      ],

      correct:

        "The square roots of 36 are 6 and −6",

      explain:

        "Correct. Both 6² and (−6)² equal 36, so its square roots are 6 and −6."

    },

    {

      title: "Restore the final seal",

      question:

        "A square courtyard has an area of 49 m². What could its side length be?",

      answers: [

        "6 m",

        "7 m",

        "14 m",

        "24.5 m"

      ],

      correct: "7 m",

      explain:

        "Correct. √49 = 7, so the side length is 7 m."

    }

  ];

  /* =====================================================

     SCENE NAVIGATION

  ===================================================== */

  function showScene(id) {

    const target = document.getElementById(id);

    if (!target) {

      showToast(

        `The scene "${id}" has not been created yet.`

      );

      return;

    }

    state.sceneVersion++;

    state.currentScene = id;

    scenes.forEach(scene => {

      scene.classList.toggle(

        "active",

        scene.id === id

      );

    });

    if (id === "court") {

      setupCourt();

    }

    if (id === "hidden-path") {

      updateSealCount();

    }

    if (id === "trial") {

      renderTrialQuestion();

    }

    if (id === "secret-court") {

      setupSecretCourt();

    }

    if (id === "welcome") {

      updateWelcomeScreen();

    }

    flash();

  }

  function flash() {

    const element = $("#screen-flash");

    if (!element) return;

    element.classList.remove("flash");

    void element.offsetWidth;

    element.classList.add("flash");

  }

  function showToast(message) {

    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(() => {

      toast.classList.remove("show");

    }, 2600);

  }

  /* =====================================================

     AUDIO

  ===================================================== */

  // Background soundtrack; original chime effects remain untouched.

  const backgroundMusic = new Audio("assets/audio/opening.mp3");

  backgroundMusic.loop = true;

  backgroundMusic.volume = 0.22;

  backgroundMusic.preload = "auto";

  function startAmbience() {

    if (!state.soundOn) return;

    const attempt = backgroundMusic.play();

    if (attempt?.catch) attempt.catch(() => {}); // Browser may require a click first.

  }

  function syncSoundButton() {

    const button = $("#sound-toggle");

    button.textContent = state.soundOn ? "♫ SOUND: ON" : "♫ SOUND: OFF";

    button.setAttribute("aria-pressed", String(state.soundOn));

  }

  syncSoundButton();

  // Start after the first user interaction, respecting browser autoplay rules.

  document.addEventListener("pointerdown", startAmbience, { once: true, capture: true });

  document.addEventListener("keydown", startAmbience, { once: true, capture: true });

  function chime(kind = "click") {

    if (!state.soundOn) return;

    try {

      state.audio =

        state.audio ||

        new (

          window.AudioContext ||

          window.webkitAudioContext

        )();

      const ctx = state.audio;

      if (ctx.state === "suspended") {

        ctx.resume();

      }

      const notes =

        kind === "success"

          ? [523, 659, 784]

          : kind === "danger"

            ? [95, 72]

            : [440, 590];

      notes.forEach((freq, i) => {

        const osc = ctx.createOscillator();

        const gain = ctx.createGain();

        osc.type =

          kind === "danger"

            ? "sawtooth"

            : "triangle";

        osc.frequency.value = freq;

        gain.gain.setValueAtTime(

          0.045,

          ctx.currentTime + i * 0.09

        );

        gain.gain.exponentialRampToValueAtTime(

          0.001,

          ctx.currentTime + i * 0.09 + 0.28

        );

        osc.connect(gain);

        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.09);

        osc.stop(ctx.currentTime + i * 0.09 + 0.3);

      });

    } catch (_) {}

  }

  $("#sound-toggle").addEventListener("click", () => {

    state.soundOn = !state.soundOn;

    try { localStorage.setItem("aurilia.sound.enabled", String(state.soundOn)); } catch (_) {}

    syncSoundButton();

    if (state.soundOn) {

      startAmbience();

      chime("success");

    } else {

      backgroundMusic.pause();

      // Mute any currently ringing Web Audio chimes as well.

      if (state.audio?.state === "running") state.audio.suspend().catch(() => {});

    }

  });

  /* =====================================================

     ROYAL SUMMONS

  ===================================================== */

  function selectSummons(choice) {

    state.route = choice;

    if (knight) {

      knight.setSummonsChoice(choice);

    }

  }

  $$("[data-go]").forEach(button => {

    button.addEventListener("click", () => {

      const destination = button.dataset.go;

      chime(

        destination === "refusal"

          ? "danger"

          : "click"

      );

      if (destination === "court") {

        selectSummons("accept");

      }

      if (destination === "refusal") {

        selectSummons("refuse");

      }

      if (destination === "summons") {

        $(".royal-letter")

          .classList.remove("letter-arrive");

      }

      if (destination === "opening") {

        resetStory();

      }

      showScene(destination);

    });

  });

  /* =====================================================

     OFFICIAL ROUTE — ROYAL COURT

  ===================================================== */

  const courtLines = [

    {

      title: "So, you have answered the call.",

      text:

        "Welcome to Aurilia, stranger. Our kingdom is on the brink of collapse. The answers we seek are hidden within the knowledge we have lost."

    },

    {

      title: "Prove that you are worthy.",

      text:

        "The Royal Archive has been corrupted. Recover the lost knowledge, solve the ancient challenges, and help us restore what remains of our kingdom."

    },

    {

      title: "Your journey begins now.",

      text:

        "The kingdom needs a mind that can see order where others see ruin. The first step is yours to take."

    }

  ];

  function setupCourt() {

    state.dialogueStep = 0;

    renderCourtLine();

    const court = $("#court");

    court.classList.remove("camera-reset");

    void court.offsetWidth;

    court.classList.add("camera-reset");

  }

  function renderCourtLine() {

    const line = courtLines[state.dialogueStep];

    $("#court-title").textContent = line.title;

    $("#court-dialogue-text").textContent =

      line.text;

    $("#dialogue-progress-fill").style.width =

      `${

        (

          (state.dialogueStep + 1) /

          courtLines.length

        ) * 100

      }%`;

    $("#court-next").innerHTML =

      state.dialogueStep === courtLines.length - 1

        ? 'BEGIN YOUR JOURNEY <span>→</span>'

        : 'CONTINUE <span>→</span>';

  }

  $("#court-next").addEventListener(

    "click",

    () => {

      chime("click");

      if (

        state.dialogueStep <

        courtLines.length - 1

      ) {

        state.dialogueStep++;

        renderCourtLine();

      } else {

        showScene("welcome");

      }

    }

  );

  /* =====================================================

     SECRET ROUTE

  ===================================================== */

  $("#begin-trial").addEventListener(

    "click",

    () => {

      state.trialIndex = 0;

      state.seals = 0;

      state.trialComplete = false;

      state.trialAnswered = false;

      updateSealCount();

      showScene("trial");

    }

  );

  function renderTrialQuestion() {

    if (state.trialComplete) return;

    const question =

      trialQuestions[state.trialIndex];

    $("#trial-number").textContent =

      `SEAL ${

        String(

          state.trialIndex + 1

        ).padStart(2, "0")

      } / 03`;

    $("#trial-title").textContent =

      question.title;

    $("#trial-question").textContent =

      question.question;

    $("#trial-feedback").textContent =

      "Choose your answer carefully.";

    $("#trial-feedback").className =

      "trial-feedback";

    $("#trial-progress-fill").style.width =

      `${(state.seals / 3) * 100}%`;

    $("#trial-continue")

      .classList.add("hidden");

    state.trialAnswered = false;

    const holder = $("#trial-answers");

    holder.replaceChildren();

    question.answers.forEach(answer => {

      const button =

        document.createElement("button");

      button.type = "button";

      button.className = "trial-answer";

      button.textContent = answer;

      button.addEventListener(

        "click",

        () => {

          chooseTrialAnswer(

            button,

            answer,

            question

          );

        }

      );

      holder.appendChild(button);

    });

  }

  function chooseTrialAnswer(

    button,

    answer,

    question

  ) {

    if (state.trialAnswered) return;

    if (answer !== question.correct) {

      button.classList.add("wrong");

      $("#trial-feedback").textContent =

        "The seal remains dark. Reconsider the clue and try again.";

      $("#trial-feedback").className =

        "trial-feedback bad";

      chime("danger");

      return;

    }

    state.trialAnswered = true;

    state.seals++;

    $$(".trial-answer").forEach(item => {

      item.disabled = true;

      if (

        item.textContent ===

        question.correct

      ) {

        item.classList.add("correct");

      }

    });

    $("#trial-feedback").textContent =

      question.explain;

    $("#trial-feedback").className =

      "trial-feedback good";

    $("#trial-progress-fill").style.width =

      `${(state.seals / 3) * 100}%`;

    updateSealCount();

    chime("success");

    $("#trial-continue").textContent =

      state.seals === 3

        ? "UNLOCK THE HIDDEN GATE →"

        : "NEXT SEAL →";

    $("#trial-continue")

      .classList.remove("hidden");

  }

  $("#trial-continue").addEventListener(

    "click",

    () => {

      if (!state.trialAnswered) return;

      if (state.seals < 3) {

        state.trialIndex++;

        renderTrialQuestion();

      } else {

        state.trialComplete = true;

        showScene("secret-court");

      }

    }

  );

  function updateSealCount() {

    $("#seal-count").textContent =

      `${state.seals} / 3 RESTORED`;

  }

  function setupSecretCourt() {

    $("#secret-court-title").textContent =

      "You refused our summons, yet here you stand.";

    $("#secret-dialogue-text").textContent =

      "Very well. If you wish to enter Aurilia, prove that your intentions are true.";

    $("#secret-meet-next").innerHTML =

      'CONTINUE <span>→</span>';

  }

  $("#secret-meet-next").addEventListener(

    "click",

    () => {

      showScene("welcome");

    }

  );

  /* =====================================================

     WELCOME — SHOW ACTUAL CAMPAIGN XP

  ===================================================== */

  function updateWelcomeScreen() {

    const stats = document.querySelectorAll(

      "#welcome .player-stats strong"

    );

    if (stats.length < 2) return;

    const campaign = knight

      ? knight.getCampaignSummary()

      : null;

    const isRegistered = Boolean(

      campaign && campaign.playerName

    );

    let displayedXP = 0;

    let displayedRank = "Royal Candidate";

    if (isRegistered) {

      displayedXP = campaign.totalXP;

      displayedRank = campaign.rank;

    } else {

      displayedXP = state.route === "accept" ? 5 : 0;

    }

    stats[0].textContent = `${displayedXP} XP`;

    stats[1].textContent = displayedRank;

    const welcomeCopy = $("#welcome-copy");

    if (welcomeCopy) {

      if (isRegistered) {

        welcomeCopy.textContent =

          `Welcome back, Knight ${campaign.playerName}. ` +

          `Your royal records have been preserved. ` +

          `Continue your journey to restore Aurilia.`;

      } else if (state.route === "refuse") {

        welcomeCopy.textContent =

          "You entered Aurilia through the hidden path. " +

          "No Royal Summons bonus was awarded, but your " +

          "journey may still change the kingdom's fate.";

      } else {

        welcomeCopy.textContent =

          "The Royal Archivist has entrusted you with " +

          "the first step of your journey.";

      }

    }

  }

  /* =====================================================

     ENTER THE ROYAL CAMPAIGN

  ===================================================== */

  $("#enter-kingdom").addEventListener("click", () => {

    chime("click");

    showScene("knight-registration");

    $("#knight-name").focus();

  });

  const modeInputs = document.querySelectorAll('input[name="aurilia-mode"]');

  const classroomFields = $("#aurilia-classroom-fields");

  function selectedMode() {

    return document.querySelector('input[name="aurilia-mode"]:checked')?.value || 'classroom';

  }

  function updateModeFields() {

    classroomFields.hidden = selectedMode() !== 'classroom';

    $("#royal-class-code").required = selectedMode() === 'classroom';

    $("#registration-error").textContent = '';

  }

  modeInputs.forEach(input => input.addEventListener('change', updateModeFields));

  updateModeFields();



  $("#register-knight").addEventListener("click", async () => {

    const nameInput = $("#knight-name");

    const codeInput = $("#royal-class-code");

    const errorElement = $("#registration-error");

    const registerButton = $("#register-knight");

    const playerName = nameInput.value.trim();

    const classCode = codeInput.value.trim().toUpperCase();

    const mode = selectedMode();

    errorElement.textContent = "";

    if (!playerName) {

      errorElement.textContent = "Please enter your Knight name.";

      nameInput.focus();

      return;

    }

    if (mode === "classroom" && !classCode) {

      errorElement.textContent = "Please enter your Royal Class Code.";

      codeInput.focus();

      return;

    }

    if (!knight || typeof knight.activatePlayer !== "function") {

      errorElement.textContent =

        "The Royal Archive is unavailable. Please try again.";

      return;

    }

    if (mode === "classroom" && !window.AuriliaClassroom) {

      errorElement.textContent =

        "The Royal Classroom system is still loading. Please try again.";

      return;

    }

    const resumePin = $("#knight-pin").value.trim();

    if (!/^[0-9]{6}$/.test(resumePin)) {

      errorElement.textContent = 'Choose a 6-digit private Resume PIN.';

      $("#knight-pin").focus();

      return;

    }

    registerButton.disabled = true;

    registerButton.textContent = mode === "classroom" ? "VERIFYING ROYAL CLASS..." : "PREPARING SOLO ADVENTURE...";

    try {

      const result = mode === "classroom"

        ? await window.AuriliaClassroom.validateCode(classCode)

        : { valid: true, code: "" };

      if (!result.valid) {

        errorElement.textContent = result.message;

        return;

      }

      const registered = knight.activatePlayer(playerName);

      if (!registered) {

        errorElement.textContent =

          "Your Knight name could not be registered.";

        return;

      }

      // Set the profile mode BEFORE any XP or leaderboard update.

      // Per-profile mode metadata. Solo never inherits a previous class code.

      const activeKnightId = localStorage.getItem('aurilia.campaign.active.v2');

      if (!activeKnightId) throw new Error('Knight profile was not activated');

      localStorage.setItem('aurilia.profile.mode.v1:' + activeKnightId, mode);

      localStorage.setItem('aurilia.profile.class.v1:' + activeKnightId, mode === 'classroom' ? result.code : '');

      if (mode === 'classroom') window.AuriliaClassroom.saveCode(result.code);

      else localStorage.removeItem('aurilia.class.code.v1');

      knight.claimPendingSummons?.();

      // Classroom registration must be confirmed by Firestore before entering.

      if (mode === 'classroom') {

        registerButton.textContent = 'RECORDING KNIGHT IN ROYAL ARCHIVE...';

        const summary = knight.getCampaignSummary();

        await window.AuriliaClassroom.registerKnight({

          knightId: activeKnightId,

          classCode: result.code,

          playerName: summary.playerName,

          totalXP: summary.totalXP,

          rank: summary.rank,

          trials: summary.trials

        });

      }

      await storePin(activeKnightId, resumePin);

      sessionStorage.removeItem("aurilia.wanderer.session.v1");

      chime("success");

      window.location.href = "games/main-quest.html";

    } catch (error) {

      console.error(error);

      errorElement.textContent =

        error?.code === 'permission-denied'

          ? 'Firestore denied registration. Check published Security Rules.'

          : 'Registration could not be saved. Check connection and try again.';

    } finally {

      registerButton.disabled = false;

      registerButton.innerHTML = "✦ BEGIN MY LEGACY →";

    }

  });


  /* ENTER KEY — Royal registration and secure Knight resume.
     Name -> class code (classroom) -> PIN -> verify/continue.
     Solo mode skips the class code. */
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.repeat || event.isComposing) return;
    const active = document.activeElement;
    if (!active || !["INPUT"].includes(active.tagName)) return;

    const resumeVisible = !$("#adventure-choice").classList.contains("hidden")
      && !$("#resume-stage").classList.contains("hidden");

    if (resumeVisible) {
      const next = {
        "resume-name": $("#resume-class-code"),
        "resume-class-code": $("#resume-pin"),
        "resume-pin": $("#continue-adventure")
      }[active.id];
      if (!next) return;
      event.preventDefault();
      if (next.id === "continue-adventure") {
        if (!next.disabled) next.click();
      } else {
        next.focus();
      }
      return;
    }

    if (state.currentScene !== "knight-registration") return;
    const next = {
      "knight-name": selectedMode() === "classroom" ? $("#royal-class-code") : $("#knight-pin"),
      "royal-class-code": $("#knight-pin"),
      "knight-pin": $("#register-knight")
    }[active.id];
    if (!next) return;
    event.preventDefault();
    if (next.id === "register-knight") {
      if (!next.disabled) next.click();
    } else {
      next.focus();
    }
  });

  /* =====================================================

     ENTER KEY — STORY NAVIGATION

  ===================================================== */

  document.addEventListener(

    "keydown",

    event => {

      if (

        event.key !== "Enter" ||

        event.repeat

      ) {

        return;

      }

      const active = document.activeElement;

      if (

        active &&

        (

          active.tagName === "INPUT" ||

          active.tagName === "TEXTAREA" ||

          active.tagName === "SELECT"

        )

      ) {

        return;

      }

      // Native Enter activation already works for

      // focused buttons and links.

      if (

        active &&

        (

          active.tagName === "BUTTON" ||

          active.tagName === "A"

        )

      ) {

        return;

      }

      const scene = state.currentScene;

      const enterActions = {

        opening: "#adventure-menu-button",

        court: "#court-next",

        welcome: "#enter-kingdom",

        "hidden-path": "#begin-trial",

        "secret-court": "#secret-meet-next",

        trial: "#trial-continue"

      };

      const selector = enterActions[scene];

      if (!selector) return;

      const button = $(selector);

      if (

        !button ||

        button.disabled ||

        button.classList.contains("hidden")

      ) {

        return;

      }

      event.preventDefault();

      button.click();

    }

  );

  /* =====================================================

     RESET STORY

  ===================================================== */

  function resetStory() {

    state.dialogueStep = 0;

    state.trialIndex = 0;

    state.seals = 0;

    state.trialAnswered = false;

    state.trialComplete = false;

    state.route = null;

    updateSealCount();

    $("#toast").classList.remove("show");

  }

  /* =====================================================

     NEW ADVENTURE / CONTINUE ADVENTURE

     REGISTERED KNIGHT & UNKNOWN WANDERER

  ===================================================== */

  const adventureChoice = $("#adventure-choice");

  const adventureMenuButton = $("#adventure-menu-button");

  const ACTIVE_PROFILE_KEY = "aurilia.campaign.active.v2";

  const PROFILES_STORAGE_KEY = "aurilia.campaign.profiles.v2";

  const LAST_KNIGHT_KEY = "aurilia.last.registered.knight.v1";

  const WANDERER_KEY = "aurilia.wanderer.session.v1";

  const PIN_KEY = 'aurilia.profile.pin.v1:';

  const PIN_ITERATIONS = 120000;

  const pinEncoder = new TextEncoder();

  async function hashPin(pin, salt) {

    const material = await crypto.subtle.importKey('raw', pinEncoder.encode(pin), 'PBKDF2', false, ['deriveBits']);

    const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:pinEncoder.encode(salt), iterations:PIN_ITERATIONS, hash:'SHA-256'}, material, 256);

    return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');

  }

  async function storePin(id, pin) {

    const salt = crypto.randomUUID();

    const hash = await hashPin(pin, salt);

    localStorage.setItem(PIN_KEY + id, JSON.stringify({salt,hash}));

  }

  async function verifyPin(id, pin) {

    let saved;

    try { saved=JSON.parse(localStorage.getItem(PIN_KEY+id)||'null'); } catch {return false;}

    if (!saved?.salt || !saved?.hash) return false;

    return (await hashPin(pin,saved.salt))===saved.hash;

  }



  let selectedKnightId = "";

  function readProfiles() {

    try {

      const profiles = JSON.parse(

        localStorage.getItem(PROFILES_STORAGE_KEY) || "{}"

      );

      return profiles && typeof profiles === "object"

        ? profiles

        : {};

    } catch (error) {

      console.warn("Could not read Knight profiles.", error);

      return {};

    }

  }

  function getRememberedKnight() {

    if (!knight) return null;

    // Allow the shared system to migrate older records.

    knight.loadCampaign();

    const profiles = readProfiles();

    const activeId =

      localStorage.getItem(ACTIVE_PROFILE_KEY) || "";

    const lastId =

      localStorage.getItem(LAST_KNIGHT_KEY) || "";

    // An active registered Knight takes priority.

    if (

      activeId &&

      profiles[activeId] &&

      profiles[activeId].playerName

    ) {

      localStorage.setItem(LAST_KNIGHT_KEY, activeId);

      sessionStorage.removeItem(WANDERER_KEY);

      return {

        id: activeId,

        campaign: profiles[activeId]

      };

    }

    // Otherwise remember the previous registered Knight.

    if (

      lastId &&

      profiles[lastId] &&

      profiles[lastId].playerName

    ) {

      return {

        id: lastId,

        campaign: profiles[lastId]

      };

    }

    return null;

  }

  function hasSavedAdventure() {

    // A Wanderer who has already chosen a new journey

    // should not be interrupted by the menu again.

    if (sessionStorage.getItem(WANDERER_KEY) === "1") {

      return false;

    }

    return getRememberedKnight() !== null;

  }

  function setResumeStage(showResume) {

    const stage = $("#resume-stage");

    const paths = $("#destiny-paths");

    stage.classList.toggle("hidden", !showResume);

    stage.setAttribute("aria-hidden", String(!showResume));

    paths.classList.toggle("hidden", showResume);

    if (showResume) $("#resume-name").focus();

    else $("#reveal-resume").focus();

  }

  function openAdventureChoice() {

    selectedKnightId = '';

    $("#adventure-player-name").textContent = 'IDENTITY REQUIRED';

    $("#adventure-player-xp").textContent = 'Your progress remains preserved';

    $("#adventure-player-progress").textContent = 'Enter your details to resume';

    $("#continue-adventure").textContent = 'VERIFY & RESUME MY KNIGHT →';

    $("#resume-name").value = '';

    $("#resume-class-code").value = '';

    $("#resume-pin").value = '';

    $("#resume-error").textContent = '';

    adventureChoice.classList.remove('hidden');

    setResumeStage(false);

  }

  function closeAdventureChoice() {

    adventureChoice.classList.add("hidden");

    adventureMenuButton.focus();

  }

  adventureMenuButton.addEventListener("click", () => {

    chime("click");

    openAdventureChoice();

  });

  $("#reveal-resume").addEventListener("click", () => {

    chime("click");

    setResumeStage(true);

  });

  $("#back-to-destiny").addEventListener("click", () => {

    chime("click");

    $("#resume-error").textContent = '';

    setResumeStage(false);

  });

  $("#cancel-adventure").addEventListener("click", closeAdventureChoice);

  // RESUME ONLY AFTER MATCHING NAME + CLASS CODE + PRIVATE PIN.

  $("#continue-adventure").addEventListener('click', async () => {

    const error = $("#resume-error");

    error.textContent = '';

    const name = knight?.cleanName($("#resume-name").value)?.toLocaleLowerCase() || '';

    const code = $("#resume-class-code").value.trim().toUpperCase();

    const pin = $("#resume-pin").value.trim();

    if (!name || !/^[0-9]{6}$/.test(pin)) {

      error.textContent = 'Enter your Knight name and 6-digit Resume PIN.';

      return;

    }

    const profiles = readProfiles();

    const matches = Object.entries(profiles).filter(([id,p]) => {

      if (p?.playerName?.toLocaleLowerCase() !== name) return false;

      const mode = localStorage.getItem('aurilia.profile.mode.v1:'+id);

      const classCode = localStorage.getItem('aurilia.profile.class.v1:'+id) || '';

      return mode === 'classroom' ? code === classCode : !code;

    });

    const button = $("#continue-adventure");

    button.disabled = true;

    button.textContent = 'VERIFYING KNIGHT IDENTITY...';

    try {

      let verifiedId = '';

      for (const [id] of matches) {

        if (await verifyPin(id,pin)) {verifiedId=id;break;}

      }

      if (!verifiedId) {

        error.textContent = 'Knight not found or PIN incorrect. Older records without a PIN require teacher-assisted recovery.';

        return;

      }

      const mode = localStorage.getItem('aurilia.profile.mode.v1:'+verifiedId);

      if (mode === 'classroom') {

        if (!window.AuriliaClassroom?.verifyKnightOwner) {

          error.textContent = 'Firebase is still loading. Please try again.';

          return;

        }

        const allowed = await window.AuriliaClassroom.verifyKnightOwner(verifiedId,code);

        if (!allowed) {

          error.textContent = 'This Knight is not owned by the current Firebase session. Ask your teacher for help.';

          return;

        }

      }

      localStorage.setItem(ACTIVE_PROFILE_KEY,verifiedId);

      localStorage.setItem(LAST_KNIGHT_KEY,verifiedId);

      localStorage.setItem('aurilia.player.name.v1',profiles[verifiedId].playerName);

      if (mode==='classroom') localStorage.setItem('aurilia.class.code.v1',code);

      else localStorage.removeItem('aurilia.class.code.v1');

      sessionStorage.removeItem(WANDERER_KEY);

      chime('success');

      window.location.href='games/main-quest.html';

    } catch (e) {

      console.error('[Aurilia] Resume verification failed:',e);

      error.textContent = 'Unable to verify your Knight. Check connection and Firebase access.';

    } finally {

      button.disabled=false;

      button.textContent='VERIFY & RESUME MY KNIGHT →';

    }

  });

  /* =====================================================

     PLAY AS NEW KNIGHT

  ===================================================== */

  $("#new-adventure").addEventListener("click", () => {

    // Remember the registered Knight before starting

    // a separate, unregistered adventure.

    const remembered = getRememberedKnight();

    if (remembered) {

      localStorage.setItem(

        LAST_KNIGHT_KEY,

        remembered.id

      );

    }

    // Disconnect the active identity.

    // Existing registered profiles are NOT deleted.

    localStorage.removeItem(ACTIVE_PROFILE_KEY);

    localStorage.removeItem("aurilia.player.name.v1");

    localStorage.removeItem("aurilia.class.code.v1");

    localStorage.removeItem("aurilia.pending.summons.v2");

    // A new player begins as an Unknown Wanderer.

    sessionStorage.setItem(WANDERER_KEY, "1");

    // Clear temporary trial state without deleting

    // registered campaigns or leaderboard records.

    const keysToClear = [];

    for (let i = 0; i < localStorage.length; i++) {

      const key = localStorage.key(i);

      if (

        key &&

        /^aurilia\.game0[1-4]\./.test(key) &&

        !key.toLowerCase().includes("leaderboard")

      ) {

        keysToClear.push(key);

      }

    }

    keysToClear.forEach(key => {

      localStorage.removeItem(key);

    });

    selectedKnightId = "";

    resetStory();

    adventureChoice.classList.add("hidden");

    chime("success");

    showScene("summons");

  });

})();
