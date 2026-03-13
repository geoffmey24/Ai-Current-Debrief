/* ═══════════════════════════════════════════════════════════
   OTTO — Save / Load (localStorage)
   ═══════════════════════════════════════════════════════════ */
'use strict';

class Storage {
  static SAVE_KEY = 'otto_save_v1';

  static hasSave() {
    return !!localStorage.getItem(this.SAVE_KEY);
  }

  static save(stats, characterState, npcSystem, careerSystem, currentLocation, gamePhase) {
    const data = {
      timestamp: Date.now(),
      stats:     stats.serialize(),
      character: characterState.serialize(),
      npcs:      npcSystem.serialize(),
      career:    careerSystem.serialize(),
      currentLocation,
      gamePhase,
    };
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  static load() {
    const raw = localStorage.getItem(this.SAVE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Load failed:', e);
      return null;
    }
  }

  static clear() {
    localStorage.removeItem(this.SAVE_KEY);
  }
}
