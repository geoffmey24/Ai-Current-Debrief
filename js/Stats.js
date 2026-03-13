/* ═══════════════════════════════════════════════════════════
   OTTO — Stats Manager
   Tracks money, knowledge, happiness, health, age
   ═══════════════════════════════════════════════════════════ */
'use strict';

class Stats {
  constructor(startingStats) {
    this.money      = startingStats.money      || 5000;
    this.knowledge  = startingStats.knowledge  || 0;
    this.happiness  = startingStats.happiness  || 75;
    this.health     = startingStats.health     || 80;
    this.age        = CONFIG.START_AGE;
    this.months     = 0;  // total months elapsed
    this.salary     = startingStats.salary     || 2000;

    // Track running totals for death screen
    this.peakMoney  = this.money;
    this.totalEarned = 0;

    // Listeners for UI updates
    this._listeners = [];
  }

  onChange(fn) {
    this._listeners.push(fn);
  }

  _notify(changes) {
    this._listeners.forEach(fn => fn(changes, this));
  }

  // Apply an effects object { money, knowledge, happiness, health }
  applyEffects(effects, animated = true) {
    const changes = {};
    if (effects.money !== undefined && effects.money !== 0) {
      this.money += effects.money;
      if (effects.money > 0) this.totalEarned += effects.money;
      changes.money = effects.money;
    }
    if (effects.knowledge !== undefined && effects.knowledge !== 0) {
      this.knowledge = Math.max(0, this.knowledge + effects.knowledge);
      changes.knowledge = effects.knowledge;
    }
    if (effects.happiness !== undefined && effects.happiness !== 0) {
      this.happiness = clamp(this.happiness + effects.happiness, 0, 100);
      changes.happiness = effects.happiness;
    }
    if (effects.health !== undefined && effects.health !== 0) {
      this.health = clamp(this.health + effects.health, 0, 100);
      changes.health = effects.health;
    }
    if (this.money > this.peakMoney) this.peakMoney = this.money;
    if (animated) this._notify(changes);
    return changes;
  }

  // Apply salary bonus (permanent monthly increase)
  increaseSalary(amount) {
    this.salary += amount;
  }

  // Advance one month
  advanceMonth() {
    this.months++;
    this.age = CONFIG.START_AGE + this.months / CONFIG.MONTHS_PER_YEAR;

    // Apply monthly salary
    if (this.salary > 0) {
      this.money += this.salary;
      this.totalEarned += this.salary;
    }

    // Passive happiness decay — life has friction
    const happDecay = -0.5;
    this.happiness = clamp(this.happiness + happDecay, 0, 100);

    // Passive health decay after 50
    if (this.age > 50) {
      this.health = clamp(this.health - 0.3, 0, 100);
    }

    // Natural health recovery if very high happiness
    if (this.happiness > 80 && this.health < 95) {
      this.health = Math.min(95, this.health + 0.5);
    }

    if (this.money > this.peakMoney) this.peakMoney = this.money;
    this._notify({ monthAdvanced: true });
  }

  // Check if alive (age < 70 and health > 0)
  isAlive() {
    return this.age < CONFIG.END_AGE && this.health > 0;
  }

  // Check if dead by age
  diedByAge() {
    return this.age >= CONFIG.END_AGE;
  }

  // Check if dead by health
  diedByHealth() {
    return this.health <= 0;
  }

  // Life score — for death summary
  calcLifeScore() {
    const moneyScore    = Math.max(0, Math.min(100, (this.money / 50000) * 40));
    const knowledgeScore = Math.min(25, this.knowledge);
    const happinessScore = this.happiness * 0.25;
    const healthScore   = this.health * 0.1;
    return Math.round(moneyScore + knowledgeScore + happinessScore + healthScore);
  }

  // Serialize for save
  serialize() {
    return {
      money: this.money,
      knowledge: this.knowledge,
      happiness: this.happiness,
      health: this.health,
      age: this.age,
      months: this.months,
      salary: this.salary,
      peakMoney: this.peakMoney,
      totalEarned: this.totalEarned,
    };
  }

  // Restore from save
  restore(data) {
    Object.assign(this, data);
  }
}
