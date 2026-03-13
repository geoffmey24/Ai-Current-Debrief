/* ═══════════════════════════════════════════════════════════
   OTTO — Config & Constants
   ═══════════════════════════════════════════════════════════ */
'use strict';

const CONFIG = {
  // Age & Time
  START_AGE: 18,
  END_AGE: 70,
  MONTHS_PER_YEAR: 12,
  TOTAL_DECISIONS: (70 - 18) * 12, // 624

  // Starting stats by location
  STARTING_STATS: {
    city: {
      money: 3000,
      knowledge: 0,
      happiness: 70,
      health: 80,
      salary: 2800,
    },
    suburb: {
      money: 5000,
      knowledge: 0,
      happiness: 75,
      health: 80,
      salary: 2200,
    },
    smalltown: {
      money: 6000,
      knowledge: 0,
      happiness: 78,
      health: 85,
      salary: 1800,
    },
  },

  // Location monthly costs
  MONTHLY_COSTS: {
    city: 1800,
    suburb: 1200,
    smalltown: 800,
  },

  // Knowledge thresholds for card access
  KNOWLEDGE_SOFT_ENTRY: 5,
  KNOWLEDGE_CARD_LOCK: 3,

  // Skin colors (hex integers for Three.js)
  SKIN_COLORS: {
    skin1: 0xFDDCB5,
    skin2: 0xF0C27F,
    skin3: 0xC68642,
    skin4: 0x8D5524,
    skin5: 0x4A2912,
  },

  // Hair colors
  HAIR_COLORS: {
    h1: 0x2C1A0E,
    h2: 0x6B3A2A,
    h3: 0xC49A3C,
    h4: 0xE8E8D0,
    h5: 0x8B1A1A,
    h6: 0x2E4057,
  },

  // Outfit colors
  OUTFIT_COLORS: {
    o1: 0x3B5998,
    o2: 0x2E7D32,
    o3: 0xC62828,
    o4: 0x6A1B9A,
    o5: 0x37474F,
    o6: 0xE65100,
  },

  // Map location world positions [x, z]
  LOCATION_POSITIONS: {
    home:     { x: -8,  z: -4  },
    office:   { x:  6,  z: -6  },
    gym:      { x: -7,  z:  5  },
    cafe:     { x:  5,  z:  4  },
    park:     { x:  0,  z:  8  },
    library:  { x: -2,  z: -8  },
  },

  // Aging visual milestones
  AGE_WRINKLE:    50,
  AGE_GRAY_START: 45,
  AGE_SLOW:       55,

  // Animation duration for decision actions (ms)
  ACTION_DURATION: 4000,

  // Weather cycle (seconds per weather state)
  WEATHER_DURATION: 60,

  // NPC relationship levels
  REL_LEVELS: {
    stranger:     0,
    acquaintance: 10,
    friend:       25,
    close_friend: 50,
    partner:      30,
  },
};

// Utility: format money
function formatMoney(n) {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString();
  return (n < 0 ? '-$' : '$') + formatted;
}

// Utility: clamp
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Utility: lerp
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Utility: random int inclusive
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Utility: random float
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Utility: chance — returns true with given probability 0-1
function chance(prob) {
  return Math.random() < prob;
}

// Utility: pick random from array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Utility: knowledge-based success chance
function knowledgeSuccessChance(knowledge) {
  if (knowledge <= 0)  return 0.1;
  if (knowledge <= 5)  return 0.3;
  if (knowledge <= 10) return 0.6;
  if (knowledge <= 15) return 0.75;
  return Math.min(0.92, 0.75 + (knowledge - 15) * 0.01);
}
