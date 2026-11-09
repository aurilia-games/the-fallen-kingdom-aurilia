/* Aurilia Epilogue — background music. Load AFTER epilogue.js. */
(() => {
  'use strict';
  const toggle = document.getElementById('sound-toggle');
  if (!toggle) return;

  const music = new Audio('../assets/audio/epilogue.mp3');
  music.loop = true;
  music.preload = 'auto';
  music.volume = 0.38;

  // Match the existing epilogue sound switch; do not replace its click handler.
  let enabled = /SOUND:\s*ON/i.test(toggle.textContent || '');
  let started = false;

  function playIfAllowed() {
    if (!enabled || !started || !music.paused) return;
    music.play().catch(error => {
      // A user gesture may be required. A subsequent click/key press retries.
      if (error.name !== 'NotAllowedError') {
        console.warn('[Aurilia] Epilogue music could not play:', error);
      }
    });
  }

  function unlock(event) {
    if (event.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(event.key)) return;
    started = true;
    playIfAllowed();
  }

  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);

  // Existing epilogue.js toggles its own soundOn and updates this button text.
  // Register after it and read the resulting label.
  toggle.addEventListener('click', () => {
    enabled = /SOUND:\s*ON/i.test(toggle.textContent || '');
    if (enabled) {
      started = true;
      playIfAllowed();
    } else {
      music.pause();
    }
  });

  music.addEventListener('error', () => {
    console.error('[Aurilia] Audio file not found or unsupported: ../assets/audio/epilogue.mp3');
  });

  window.addEventListener('pagehide', () => music.pause());
})();
