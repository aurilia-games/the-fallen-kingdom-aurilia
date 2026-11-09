"use strict";

(() => {
  const campaign = document.getElementById("campaign");
  const canvas = document.getElementById("embers");
  const context = canvas?.getContext("2d");

  const cards = [...document.querySelectorAll(".location-card")];
  const briefing = document.getElementById("briefing");
  const briefingImage = document.getElementById("briefing-image");
  const briefingTitle = document.getElementById("briefing-title");
  const briefingDescription = document.getElementById("briefing-description");
  const briefingChapter = document.getElementById("briefing-chapter");
  const briefingEyebrow = document.getElementById("briefing-eyebrow");
  const briefingObjective = document.getElementById("briefing-objective");
  const briefingStandard = document.getElementById("briefing-standard");
  const briefingStyle = document.getElementById("briefing-style");
  const briefingNote = document.getElementById("briefing-note");
  const briefingClose = document.getElementById("briefing-close");
  const briefingEnter = document.getElementById("briefing-enter");
  const toast = document.getElementById("toast");
  const soundToggle = document.getElementById("sound-toggle");
  const soundLabel = document.getElementById("sound-label");
  const selectionFlash = document.getElementById("selection-flash");
  const discoveredCount = document.getElementById("discovered-count");
  const kingdomStatus = document.getElementById("kingdom-status");

  function updateCampaignProgress() {
    const campaign = window.AuriliaKnight?.loadCampaign?.();

    const trialKeys = ["game01", "game02", "game03", "game04"];

    const completedCount = trialKeys.filter(
      (key) => campaign?.trials?.[key]?.completed === true
    ).length;

    if (discoveredCount) {
      discoveredCount.innerHTML =
        `${String(completedCount).padStart(2, "0")} <small>/ 04</small>`;
    }

    if (kingdomStatus) {
      const restored = completedCount === 4;

      kingdomStatus.classList.toggle("status-fallen", !restored);
      kingdomStatus.classList.toggle("status-restored", restored);

      kingdomStatus.innerHTML = restored
        ? "<span></span> RESTORED"
        : "<span></span> FALLEN";
    }
  }

    updateCampaignProgress();

    /* ==========================================
      ROYAL TRIAL COMPLETION BADGES
      Based on the active Knight's saved progress
    ========================================== */

    const trialCardKeys = {
      grounds: "game01",
      forge: "game02",
      bridge: "game03",
      throne: "game04"
    };

    function updateTrialCompletionBadges() {
      const activeCampaign = window.AuriliaKnight?.loadCampaign?.();

      cards.forEach((card) => {
        const trialKey = trialCardKeys[card.dataset.location];

        const completed =
          activeCampaign?.trials?.[trialKey]?.completed === true;

        let badge = card.querySelector(".trial-completed-badge");

        if (!badge) {
          badge = document.createElement("span");
          badge.className = "trial-completed-badge";
          badge.setAttribute("aria-hidden", "true");
          badge.textContent = "✓ TRIAL COMPLETED";
          card.appendChild(badge);
        }

        badge.classList.toggle("is-visible", completed);
      });
    }

    updateTrialCompletionBadges();

    window.addEventListener("pageshow", () => {
      updateTrialCompletionBadges();
      updateCampaignProgress();
      updateCampaignInfo();
    });

    const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /*
   * IMPORTANT:
   * This script is inside games/js/.
   * The game pages are inside games/.
   * Use paths relative to the current quest.html page.
   */
  const locations = {
    grounds: {
      title: "The Shattered Grounds",
      chapter: "ROYAL ARCHIVE · TRIAL 01",
      eyebrow: "THE BROKEN COURTYARD",
      description:
        "The royal courtyard lies in ruins, its ancient stone paths shattered by the fall of Aurilia. Beneath the dust, the kingdom's forgotten markings still hold the power to reveal a safe passage. Only those who recognise the perfect squares may cross the broken grounds and restore the first fragment of the fallen kingdom.",
      objective:
        "Identify perfect squares and cross the shattered courtyard without falling into the ruins.",
      standard: "DSKP 3.1.2",
      style: "EXPLORATION & MOVEMENT",
      image: "../assets/floating-tiles.webp",
      note:
        "Your first trial begins here. Choose your steps wisely, uncover the hidden pattern of perfect squares, and prove that you are worthy of the kingdom."
    },

    forge: {
      title: "The Forgotten Labyrinth",
      chapter: "THE LOST PASSAGE · TRIAL 02",
      eyebrow: "THE ANCIENT MAZE",
      description:
        "Beneath the fallen kingdom lies a labyrinth sealed by ancient magic. Its winding passages conceal forgotten mechanisms, hidden dangers, and symbols left by the royal scholars. Every turn brings a new challenge, and one wrong move may lead you deeper into the darkness.",
      objective:
        "Navigate the labyrinth, overcome hidden mechanisms, and solve mathematical challenges to unlock the path forward.",
      standard: "DSKP 3.1.2",
      style: "EXPLORATION & LOGIC",
      image: "../assets/maze-kingdom.webp",
      note:
        "The forgotten passage awaits. Enter the labyrinth, decipher its ancient mechanisms, and uncover the path to the heart of the fallen kingdom."
    },

    bridge: {
      title: "Starfall Citadel",
      chapter: "THE TWIN-RUNE TRIAL · TRIAL 03",
      eyebrow: "THE FORGOTTEN CITADEL",
      description:
        "Beneath the storm-darkened skies of Aurilia, an ancient citadel stands guarded by a fearsome dragon and two sealed runes. The forgotten power of squares and square roots holds the key to breaking their seal. Uncover their hidden relationship, awaken the twin runes, and withstand the dragon's fury to reclaim the citadel.",
      objective:
        "Reveal the relationship between square numbers and square roots, and activate the twin runes.",
      standard: "DSKP 3.1.3",
      style: "RUNE TRIAL & REASONING",
      image: "../assets/star-dragon.png",
      note:
        "The dragon stirs beneath the ruins. Restore the ancient runes, prove your understanding of positive and negative square roots, and survive the trial that guards the next stage of Aurilia."
    },
 
    throne: {
      title: "The Betrayer's Throne",
      chapter: "THE FINAL CONFRONTATION · TRIAL 04",
      eyebrow: "THE LAST ROYAL SEAL",
      description:
        "At the heart of the fallen kingdom, the Betrayer's Throne lies sealed behind ancient enchanted gates. Each gate conceals a mathematical trial, and every correct answer weakens the royal seal. Solve the mysteries of squares and square roots, overcome the guardian's final challenge, and reclaim the fate of Aurilia.",
      objective:
        "Solve square and square-root challenges to unlock the sealed gates and defeat the final guardian.",
      standard: "DSKP 3.1.3",
      style: "FINAL TRIAL & STRATEGY",
      image: "../assets/gate-perfect.png",
      note:
        "The final seal awaits its challenger. Enter the throne's domain, solve the ancient trials, and prove your mastery of positive and negative square roots to determine the fate of Aurilia."
    },
  };

  const discovered = new Set();
  let activeLocation = null;
  let lastFocusedElement = null;
  let toastTimer = null;
  // Baca XP terbaik yang telah disimpan daripada Game 2.
  function getGame2XP() {
    try {
      const savedXP = Number(
        localStorage.getItem("auriliaGame2XP") || 0
      );

      if (!Number.isFinite(savedXP)) return 0;

      return Math.max(0, Math.min(30, savedXP));
    } catch (error) {
      console.warn("Game 2 XP could not be read.", error);
      return 0;
    }
  }

  const KNIGHT_RANKS = [
    { name: "Royal Candidate", minXP: 0 },
    { name: "Royal Initiate", minXP: 20 },
    { name: "Seal Keeper", minXP: 60 },
    { name: "Knight of Aurilia", minXP: 120 },
    { name: "Royal Guardian", minXP: 220 },
    { name: "Crown Champion", minXP: 350 },
    { name: "Sovereign of Aurilia", minXP: 450 }
  ];

  function updateCampaignInfo() {
  const knightSystem = window.AuriliaKnight;

  if (!knightSystem) {
    console.warn("Aurilia Knight System is unavailable.");
    return;
  }

  const summary = knightSystem.getCampaignSummary();

  const rankElement = document.getElementById("knight-rank");
  const xpElement = document.getElementById("total-xp");

  if (rankElement) {
    rankElement.textContent = summary.rank;
  }

  if (xpElement) {
    xpElement.innerHTML =
      `${summary.totalXP} <small>/ ${knightSystem.MAX_XP} XP</small>`;
  }
}

  /* CINEMATIC PARTICLES */

  const particles = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pixelRatio = 1;
  let animationFrame = 0;
  let lastFrameTime = 0;

  function createParticle(initial = false) {
    return {
      x: Math.random() * canvasWidth,
      y: initial ? Math.random() * canvasHeight : canvasHeight + 10,
      radius: 0.5 + Math.random() * 1.8,
      speedY: 8 + Math.random() * 24,
      speedX: -7 + Math.random() * 14,
      alpha: 0.25 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      shimmer: 0.6 + Math.random() * 1.8
    };
  }

  function resizeCanvas() {
    if (!canvas || !context) return;

    const bounds = canvas.getBoundingClientRect();

    canvasWidth = Math.max(1, bounds.width);
    canvasHeight = Math.max(1, bounds.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const desiredCount = reducedMotion
      ? 12
      : Math.min(75, Math.floor((canvasWidth * canvasHeight) / 17000));

    particles.length = 0;

    for (let i = 0; i < desiredCount; i++) {
      particles.push(createParticle(true));
    }
  }

  function drawParticles(time) {
    if (!context || !canvas) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const delta = lastFrameTime
      ? Math.min((time - lastFrameTime) / 1000, 0.04)
      : 0;

    lastFrameTime = time;

    for (const particle of particles) {
      if (!reducedMotion) {
        particle.y -= particle.speedY * delta;
        particle.x += particle.speedX * delta;
        particle.phase += delta * particle.shimmer;
      }

      if (particle.y < -8) {
        Object.assign(particle, createParticle(false));
        particle.y = canvasHeight + 5;
      }

      if (particle.x < -8) particle.x = canvasWidth + 5;
      if (particle.x > canvasWidth + 8) particle.x = -5;

      const flicker = reducedMotion
        ? 1
        : 0.72 + Math.sin(particle.phase) * 0.28;

      context.beginPath();
      context.arc(
        particle.x,
        particle.y,
        particle.radius,
        0,
        Math.PI * 2
      );

      context.fillStyle =
        `rgba(255, ${155 + Math.floor(flicker * 65)}, 86, ${particle.alpha * flicker})`;

      context.shadowBlur = reducedMotion ? 0 : 8;
      context.shadowColor = "rgba(255, 166, 70, 0.35)";
      context.fill();
    }

    context.shadowBlur = 0;

    if (!reducedMotion) {
      animationFrame = requestAnimationFrame(drawParticles);
    }
  }

  function startParticles() {
    if (!canvas || !context) return;

    resizeCanvas();

    if (reducedMotion) {
      drawParticles(0);
      return;
    }

    cancelAnimationFrame(animationFrame);
    lastFrameTime = 0;
    animationFrame = requestAnimationFrame(drawParticles);
  }

  if (canvas && context) {
    startParticles();
    window.addEventListener("resize", resizeCanvas, { passive: true });
  }

  /* POINTER PARALLAX */

  let pointerFrame = 0;

  function updatePointer(event) {
    if (
      reducedMotion ||
      window.matchMedia("(pointer: coarse)").matches ||
      !campaign
    ) {
      return;
    }

    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;

    cancelAnimationFrame(pointerFrame);

    pointerFrame = requestAnimationFrame(() => {
      campaign.style.setProperty("--pointer-x", `${x * 8}%`);
      campaign.style.setProperty("--pointer-y", `${y * 8}%`);

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();

        const localX = (event.clientX - rect.left) / rect.width - 0.5;
        const localY = (event.clientY - rect.top) / rect.height - 0.5;

        const hovered =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;

        card.style.setProperty("--tilt-x", hovered ? `${localY * -3}deg` : "0deg");
        card.style.setProperty("--tilt-y", hovered ? `${localX * 3}deg` : "0deg");
        card.style.setProperty("--pointer-x", hovered ? `${localX * 2}` : "0");
        card.style.setProperty("--pointer-y", hovered ? `${localY * 2}` : "0");
      });
    });
  }

  document.addEventListener("pointermove", updatePointer, { passive: true });

  /* TOAST */

  function showToast(message) {
    if (!toast) {
      console.info(message);
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  /* OPTIONAL SOUND */

  let audioContext = null;
  let soundEnabled = true;

  // Path is relative to games/quest.html, not games/js/quest.js.
  const questMusic = new Audio("../assets/audio/quest.mp3");
  questMusic.loop = true;
  questMusic.volume = 0.28;
  questMusic.preload = "auto";

  function updateSoundButton() {
    soundToggle?.setAttribute("aria-pressed", String(soundEnabled));
    if (soundLabel) soundLabel.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
  }

  function startQuestMusic() {
    if (!soundEnabled || !questMusic.paused) return;
    const attempt = questMusic.play();
    if (attempt?.catch) {
      attempt.catch((error) => {
        if (error.name !== "NotAllowedError") {
          console.warn("Quest music could not be played. Check assets/audio/quest.mp3.", error);
        }
      });
    }
  }

  // Browsers may block autoplay until the first user interaction.
  document.addEventListener("pointerdown", startQuestMusic, { passive: true });
  document.addEventListener("keydown", startQuestMusic);
  window.addEventListener("pageshow", startQuestMusic);
  updateSoundButton();
  startQuestMusic();

  function playTone(frequency, duration, volume = 0.025) {
    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContext) audioContext = new AudioContextClass();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        volume,
        audioContext.currentTime + 0.04
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration + 0.05);
    } catch (error) {
      console.warn("Aurilia audio could not be played.", error);
    }
  }

  soundToggle?.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;

    soundToggle.setAttribute("aria-pressed", String(soundEnabled));

    if (soundLabel) {
      soundLabel.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
    }

    if (soundEnabled) {
      startQuestMusic();
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;

        if (AudioContextClass && !audioContext) {
          audioContext = new AudioContextClass();
        }

        if (audioContext?.state === "suspended") {
          await audioContext.resume();
        }
      } catch (error) {
        console.warn("Audio could not be enabled.", error);
      }

      playTone(523.25, 0.22, 0.018);
      showToast("Aurilia's ambient sound is enabled.");
    } else {
      questMusic.pause();
      showToast("Sound disabled.");
    }
  });

  /* MISSION BRIEFING */

  function openBriefing(locationId, triggerElement) {
    const location = locations[locationId];

    if (!location || !briefing) return;

    activeLocation = locationId;
    lastFocusedElement = triggerElement || document.activeElement;

    cards.forEach((card) => {
      const selected = card.dataset.location === locationId;

      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });

    discovered.add(locationId);
    updateCampaignProgress();

    if (briefingTitle) briefingTitle.textContent = location.title;
    if (briefingDescription) briefingDescription.textContent = location.description;
    if (briefingChapter) briefingChapter.textContent = location.chapter;
    if (briefingEyebrow) briefingEyebrow.textContent = location.eyebrow;
    if (briefingObjective) briefingObjective.textContent = location.objective;
    if (briefingStandard) briefingStandard.textContent = location.standard;
    if (briefingStyle) briefingStyle.textContent = location.style;
    if (briefingNote) briefingNote.textContent = location.note;

    
    if (briefingImage) {
      briefingImage.style.setProperty(
        "--briefing-image",
        `url("${location.image}")`
      );

      briefingImage.style.backgroundImage =
        `url("${location.image}")`;
    }

    briefing.classList.add("open");
    briefing.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    selectionFlash?.classList.remove("flash");

    if (!reducedMotion && selectionFlash) {
      void selectionFlash.offsetWidth;
      selectionFlash.classList.add("flash");
    }

    playTone(392, 0.18, 0.02);

    window.setTimeout(() => briefingClose?.focus(), reducedMotion ? 0 : 180);
  }

  function closeBriefing() {
    if (!briefing?.classList.contains("open")) return;

    briefing.classList.remove("open");
    briefing.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    cards.forEach((card) => {
      card.classList.remove("selected");
      card.setAttribute("aria-pressed", "false");
    });

    activeLocation = null;

    if (lastFocusedElement?.isConnected) {
      lastFocusedElement.focus();
    }
  }

  cards.forEach((card) => {
    card.setAttribute("aria-pressed", "false");

    card.addEventListener("click", () => {
      openBriefing(card.dataset.location, card);
    });

    card.addEventListener(
      "pointerenter",
      () => {
        if (!reducedMotion) playTone(261.63, 0.055, 0.006);
      },
      { passive: true }
    );
  });

  briefingClose?.addEventListener("click", closeBriefing);

  
  /* ROUTING — ALL FOUR ROYAL TRIALS */

  briefingEnter?.addEventListener("click", () => {
    if (!activeLocation) {
      showToast("Please select a royal trial first.");
      return;
    }

    const destinations = {
      grounds: "game-01.html",
      forge: "game-02.html",
      bridge: "game-03.html",
      throne: "game-04.html"
    };

    const destination = destinations[activeLocation];

    if (!destination) {
      showToast("This royal trial could not be found.");
      return;
    }

    window.location.assign(destination);
  });

  /* KEYBOARD AND MODAL ACCESSIBILITY */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeBriefing();

    if (
      event.key === "Tab" &&
      briefing?.classList.contains("open")
    ) {
      const focusable = [
        ...briefing.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ];

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (
      briefing?.classList.contains("open") &&
      !briefing.contains(event.target) &&
      !event.target.closest(".location-card")
    ) {
      closeBriefing();
    }
  });

  /* IMAGE FALLBACKS */

  document.querySelectorAll(".location-image").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.style.display = "none";
        image.closest(".location-card")?.classList.add("image-unavailable");
      },
      { once: true }
    );
  });

  /* INITIAL STATE */
    /* INITIAL CAMPAIGN XP */

  updateCampaignInfo();
  
  cards.forEach((card) => card.setAttribute("aria-pressed", "false"));

  console.info(
    "Aurilia Royal Campaign initialized.",
    `${cards.length} locations available.`
  );
})();