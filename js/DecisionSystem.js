/* ═══════════════════════════════════════════════════════════
   OTTO — Decision System
   Picks appropriate cards, evaluates outcomes, resolves effects
   ═══════════════════════════════════════════════════════════ */
'use strict';

class DecisionSystem {
  constructor(stats, characterState, npcSystem, careerSystem) {
    this.stats         = stats;
    this.characterState = characterState;
    this.npcSystem     = npcSystem;
    this.careerSystem  = careerSystem;

    this.recentCards   = []; // prevent immediate repeats
    this.maxRecent     = 5;
    this._listeners    = [];
  }

  onChange(fn) { this._listeners.push(fn); }
  _notify(ev)  { this._listeners.forEach(f => f(ev)); }

  /* ─────────────────────────────────────────────────────────
     Get a decision card for a trigger/location
     ───────────────────────────────────────────────────────── */
  getCardForTrigger(triggerId, locationId) {
    let pool = [];

    // Build pool from relevant trigger categories
    const categories = this._getCategoriesForTrigger(triggerId, locationId);
    categories.forEach(cat => {
      const cards = DECISION_DATA[cat] || [];
      cards.forEach(card => {
        if (!this.recentCards.includes(card.id) && this._cardIsAccessible(card)) {
          pool.push(card);
        }
      });
    });

    // Always check random events (small chance)
    if (chance(0.18)) {
      const events = DECISION_DATA.random_events || [];
      events.forEach(card => {
        if (!this.recentCards.includes(card.id) && this._cardIsAccessible(card)) {
          pool.push(card);
        }
      });
    }

    // Check relationship cards
    if (this.npcSystem.hasPartner()) {
      const relCards = DECISION_DATA.relationship || [];
      relCards.filter(c => c.trigger === 'has_partner' || c.trigger === 'has_partner_low_rel').forEach(card => {
        if (chance(0.25) && !this.recentCards.includes(card.id)) {
          // Only show breakup card if partner relationship is low
          if (card.trigger === 'has_partner_low_rel' && this.npcSystem.partnerRelationshipLevel() > 15) return;
          pool.push(card);
        }
      });
    }

    // Check NPC romance interest cards
    if (this.npcSystem.hasRomanticInterest(locationId) && !this.npcSystem.hasPartner()) {
      const romCards = DECISION_DATA.relationship.filter(c => c.trigger === 'npc_interest');
      romCards.forEach(card => {
        if (chance(0.35) && !this.recentCards.includes(card.id)) pool.push(card);
      });
    }

    // If pool is empty, fall back to generic
    if (pool.length === 0) {
      pool = DECISION_DATA[categories[0]] || DECISION_DATA.random_events;
    }

    const card = pick(pool);
    if (!card) return null;

    // Mark as recent
    this.recentCards.push(card.id);
    if (this.recentCards.length > this.maxRecent) this.recentCards.shift();

    // Resolve dynamic text (replace {{npc_name}} etc.)
    return this._resolveCardText(card, locationId);
  }

  _getCategoriesForTrigger(triggerId, locationId) {
    const map = {
      home_desk: ['home_desk'],
      gym:       ['gym'],
      office:    ['office'],
      cafe:      ['cafe'],
      park:      ['park'],
      library:   ['library'],
    };
    return map[triggerId] || map[locationId] || ['random_events'];
  }

  _cardIsAccessible(card) {
    if (card.requiresKnowledge && this.stats.knowledge < CONFIG.KNOWLEDGE_CARD_LOCK) {
      return false; // Fully locked
    }
    return true;
  }

  _resolveCardText(card, locationId) {
    const clone = JSON.parse(JSON.stringify(card));
    const partner = this.npcSystem.getPartner();
    const npcName = partner?.name || this.npcSystem.getNPCsByLocation(locationId)[0]?.name || 'someone';

    const replaceText = (str) => str
      .replace(/\{\{npc_name\}\}/g, npcName)
      .replace(/\{\{location\}\}/g, locationId);

    clone.title       = replaceText(clone.title);
    clone.description = replaceText(clone.description);
    clone.options = clone.options.map(opt => ({
      ...opt,
      text: replaceText(opt.text),
    }));

    clone._locationId = locationId;
    return clone;
  }

  /* ─────────────────────────────────────────────────────────
     Evaluate an option choice and return resolved effects
     ───────────────────────────────────────────────────────── */
  evaluateChoice(card, optionIndex) {
    const option = card.options[optionIndex];
    if (!option) return null;

    const result = {
      effects: { ...option.effects },
      messages: [],
      careerEvent: null,
      npcEvent: null,
      success: true,
    };

    // Check soft knowledge lock
    if (card.requiresKnowledge && this.stats.knowledge < card.requiresKnowledge) {
      const successChance = knowledgeSuccessChance(this.stats.knowledge);
      if (!chance(successChance)) {
        result.success = false;
        result.messages.push('Your knowledge level wasn\'t quite enough this time.');
        result.effects.money = Math.round((result.effects.money || 0) * 0.3);
        result.effects.happiness = (result.effects.happiness || 0) - 5;
      }
    }

    // Resolve successChance
    if (option.successChance !== undefined) {
      let prob;
      if (option.successChance === 'knowledge') {
        prob = knowledgeSuccessChance(this.stats.knowledge);
      } else if (option.successChance === 'health') {
        prob = this.stats.health / 100;
      } else if (option.successChance === 'stats') {
        // Combined stats chance for romance
        prob = (this.stats.happiness / 200) + (this.stats.money > 2000 ? 0.1 : 0) + 0.2;
      } else {
        prob = option.successChance;
      }

      if (chance(prob)) {
        // Success
        if (option.successMoney) result.effects.money = (result.effects.money || 0) + option.successMoney;
        if (option.successHappiness) result.effects.happiness = (result.effects.happiness || 0) + option.successHappiness;
        if (option.successSalary) {
          result.careerEvent = { type: 'salary_increase', amount: option.successSalary };
        }
        if (option.careerChange) {
          result.careerEvent = { type: 'career_change', locationId: card._locationId };
        }
        if (option.promoteCareer) {
          result.careerEvent = { type: 'promote' };
        }
        result.messages.push(this._successMessage());
      } else {
        // Fail
        result.success = false;
        if (option.failMoney !== undefined) result.effects.money = (result.effects.money || 0) + option.failMoney;
        if (option.failHappiness !== undefined) result.effects.happiness = (result.effects.happiness || 0) + option.failHappiness;
        if (option.failJobLoss) {
          result.careerEvent = { type: 'job_lost', reason: 'failed_attempt' };
        }
        result.messages.push(this._failMessage());
      }
    } else {
      // Deterministic
      if (option.careerChange) result.careerEvent = { type: 'career_change', locationId: card._locationId };
      if (option.careerBonus)  this.careerSystem.addCareerScore(1);
      if (option.careerPenalty) this.careerSystem.addCareerScore(-1);
      if (option.promoteCareer) result.careerEvent = { type: 'promote' };
    }

    // Job loss
    if (option.jobLoss) {
      result.careerEvent = { type: 'job_lost', reason: 'layoff' };
    }

    // Breakup
    if (option.breakup) {
      result.npcEvent = { type: 'breakup' };
    }

    // Relationship effects
    if (option.effects?.relationship) {
      result.npcEvent = result.npcEvent || {};
      result.npcEvent.relationship = option.effects.relationship;
      result.npcEvent.locationId   = card._locationId;
      delete result.effects.relationship;
    }

    // Danger risk (early death)
    if (option.dangerRisk && chance(0.35)) {
      result.dangerousActivity = true;
      result.effects.health = (result.effects.health || 0) - 40;
      result.messages.push('That was a dangerous choice...');
    }

    return result;
  }

  /* ─────────────────────────────────────────────────────────
     Apply a resolved result to game state
     ───────────────────────────────────────────────────────── */
  applyResult(result) {
    // Apply stat effects
    this.stats.applyEffects(result.effects);

    // Career events
    if (result.careerEvent) {
      const ev = result.careerEvent;
      if (ev.type === 'promote') {
        this.careerSystem.forcePromotion();
      } else if (ev.type === 'salary_increase') {
        this.stats.increaseSalary(ev.amount);
        this.stats.salary += ev.amount;
      } else if (ev.type === 'job_lost') {
        this.careerSystem.loseJob(ev.reason);
        this.stats.salary = 0;
      } else if (ev.type === 'career_change') {
        this._handleCareerChange(ev.locationId);
      }
    }

    // NPC events
    if (result.npcEvent) {
      const ev = result.npcEvent;
      if (ev.type === 'breakup') {
        this.npcSystem.endRomance();
      }
      if (ev.relationship) {
        const rel = ev.relationship;
        if (rel.npcType === 'romantic') {
          const partner = this.npcSystem.getPartner();
          if (partner) {
            this.npcSystem.adjustRelationship(partner.id, rel.delta);
          } else if (rel.delta > 0) {
            // Start a new romance
            const candidate = this.npcSystem.getRomanticInterestAt(ev.locationId)
              || this.npcSystem.getNPCByType('romantic_interest');
            if (candidate && rel.delta >= 20) {
              this.npcSystem.startRomance(candidate.id);
            } else if (candidate) {
              this.npcSystem.adjustRelationship(candidate.id, rel.delta);
            }
          }
        } else {
          this.npcSystem.adjustTypeRelationship(rel.npcType, rel.delta);
        }
      }
    }

    // Update stats salary from career
    if (this.careerSystem.isEmployed()) {
      this.stats.salary = this.careerSystem.getCurrentSalary();
    } else {
      this.stats.salary = 0;
    }

    this._notify({ type: 'result_applied', result });
  }

  _handleCareerChange(locationId) {
    const available = this.careerSystem.canApplyAt(locationId, this.stats);
    if (available.length > 0) {
      const bestJob = available.reduce((best, job) =>
        job.salary > (best?.salary || 0) ? job : best, null);
      if (bestJob && bestJob.salary > this.careerSystem.getCurrentSalary()) {
        this.careerSystem.startJob(bestJob.id);
        this.stats.salary = bestJob.salary;
        this.characterState.recordJob(bestJob.title, bestJob.company);
      }
    }
  }

  _successMessage() {
    return pick([
      'It worked out perfectly!',
      'Great outcome!',
      'You pulled it off.',
      'Success!',
      'Things went your way.',
    ]);
  }

  _failMessage() {
    return pick([
      'It didn\'t go as planned.',
      'Not this time.',
      'Things fell short.',
      'Tough break.',
      'Needs more preparation.',
    ]);
  }

  /* ─── Check achievement conditions ─── */
  checkAchievements() {
    const s = this.stats;
    const cs = this.characterState;

    if (s.money >= 100000 && !cs.achievements.includes('💰 Hundred Thousandaire')) {
      cs.addAchievement('💰 Hundred Thousandaire');
    }
    if (s.money >= 500000 && !cs.achievements.includes('💎 Half Millionaire')) {
      cs.addAchievement('💎 Half Millionaire');
    }
    if (s.knowledge >= 20 && !cs.achievements.includes('🎓 Expert')) {
      cs.addAchievement('🎓 Expert');
    }
    if (s.knowledge >= 30 && !cs.achievements.includes('🏆 Master')) {
      cs.addAchievement('🏆 Master');
    }
    if (s.happiness >= 95 && !cs.achievements.includes('😄 Genuinely Happy')) {
      cs.addAchievement('😄 Genuinely Happy');
    }
    if (s.health >= 95 && s.age > 50 && !cs.achievements.includes('💪 Healthy at 50+')) {
      cs.addAchievement('💪 Healthy at 50+');
    }
    if (this.npcSystem.hasPartner() && !cs.achievements.includes('❤️ Found Love')) {
      cs.addAchievement('❤️ Found Love');
    }
    if (this.npcSystem.getFriends().length >= 3 && !cs.achievements.includes('🤝 Social Butterfly')) {
      cs.addAchievement('🤝 Social Butterfly');
    }
    if (this.careerSystem.currentJob.tier >= 4 && !cs.achievements.includes('🏢 Executive')) {
      cs.addAchievement('🏢 Executive');
    }
    if (this.careerSystem.currentJob.tier >= 5 && !cs.achievements.includes('👑 C-Suite')) {
      cs.addAchievement('👑 C-Suite');
    }
    if (s.money < 0 && !cs.achievements.includes('📉 In the Red')) {
      cs.addAchievement('📉 In the Red');
    }
  }
}
