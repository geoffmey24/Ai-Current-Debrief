/* ═══════════════════════════════════════════════════════════
   OTTO — Entry Point
   ═══════════════════════════════════════════════════════════ */
'use strict';

// Guard: ensure Three.js loaded
if (typeof THREE === 'undefined') {
  document.body.innerHTML = '<div style="color:white;text-align:center;padding:40px;font-family:sans-serif">' +
    '<h2>Connection Required</h2><p>Otto needs internet access to load. Please connect and refresh.</p></div>';
} else {
  window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();

    // Expose for debugging (dev only)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      window._game = game;
    }
  });
}
