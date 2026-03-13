/* ═══════════════════════════════════════════════════════════
   OTTO — Character State
   Player customization + derived visual state
   ═══════════════════════════════════════════════════════════ */
'use strict';

class CharacterState {
  constructor() {
    // Customization (set at character creation)
    this.name        = 'Otto';
    this.skinKey     = 'skin1';
    this.hairStyleKey = 'A';
    this.hairColorKey = 'h1';
    this.outfitKey   = 'o1';

    // Derived Three.js colors
    this.skinColor    = CONFIG.SKIN_COLORS.skin1;
    this.hairColor    = CONFIG.HAIR_COLORS.h1;
    this.outfitColor  = CONFIG.OUTFIT_COLORS.o1;

    // Current outfit type (changes by location)
    this.currentOutfitType = 'casual';

    // Track visited locations (for achievements)
    this.visitedLocations = new Set();

    // Achievements accumulated
    this.achievements = [];

    // Jobs held (for death screen)
    this.jobsHeld = [];
  }

  applyCustomization(customization) {
    this.name        = customization.name || 'Player';
    this.skinKey     = customization.skinKey     || 'skin1';
    this.hairStyleKey = customization.hairStyle  || 'A';
    this.hairColorKey = customization.hairColorKey || 'h1';
    this.outfitKey   = customization.outfitKey   || 'o1';

    // Convert to numeric colors
    this.skinColor   = CONFIG.SKIN_COLORS[this.skinKey]     || 0xFDDCB5;
    this.hairColor   = CONFIG.HAIR_COLORS[this.hairColorKey] || 0x2C1A0E;
    this.outfitColor = CONFIG.OUTFIT_COLORS[this.outfitKey]  || 0x3B5998;
  }

  // Get outfit color for a given location type
  getOutfitColor(outfitType) {
    switch (outfitType) {
      case 'formal':   return 0x2C3E50;    // dark suit
      case 'athletic': return 0xFF5722;    // workout gear
      case 'casual':   return this.outfitColor;
      default:         return this.outfitColor;
    }
  }

  // Calculate the gray-blend factor for hair (0 = original, 1 = full gray)
  hairGrayFactor(age) {
    if (age < CONFIG.AGE_GRAY_START) return 0;
    return clamp((age - CONFIG.AGE_GRAY_START) / 20, 0, 0.85);
  }

  // Get current aged hair color
  getAgedHairColor(age) {
    const factor = this.hairGrayFactor(age);
    const gray = 0xBBBBBB;
    return lerpColor(this.hairColor, gray, factor);
  }

  // Walk speed factor (slows after 55)
  walkSpeedFactor(age) {
    if (age < CONFIG.AGE_SLOW) return 1.0;
    return Math.max(0.5, 1.0 - (age - CONFIG.AGE_SLOW) / 30);
  }

  // Check if character looks tired
  isTired(happiness, health) {
    return happiness < 30 || health < 25;
  }

  recordVisit(locationId) {
    this.visitedLocations.add(locationId);
  }

  addAchievement(achievement) {
    if (!this.achievements.includes(achievement)) {
      this.achievements.push(achievement);
    }
  }

  recordJob(jobTitle, company) {
    if (!this.jobsHeld.some(j => j.title === jobTitle)) {
      this.jobsHeld.push({ title: jobTitle, company });
    }
  }

  serialize() {
    return {
      name: this.name,
      skinKey: this.skinKey,
      hairStyleKey: this.hairStyleKey,
      hairColorKey: this.hairColorKey,
      outfitKey: this.outfitKey,
      skinColor: this.skinColor,
      hairColor: this.hairColor,
      outfitColor: this.outfitColor,
      visitedLocations: [...this.visitedLocations],
      achievements: [...this.achievements],
      jobsHeld: [...this.jobsHeld],
    };
  }

  restore(data) {
    Object.assign(this, data);
    this.visitedLocations = new Set(data.visitedLocations || []);
    this.achievements = data.achievements || [];
    this.jobsHeld = data.jobsHeld || [];
  }
}

// ── Color lerp helper ──
function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}
