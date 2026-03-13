/* ═══════════════════════════════════════════════════════════
   OTTO — UI Manager
   Controls all HTML overlay elements, screens, HUD, cards
   ═══════════════════════════════════════════════════════════ */
'use strict';

class UI {
  constructor() {
    // Screen elements
    this.screens = {
      title:    document.getElementById('screen-title'),
      create:   document.getElementById('screen-create'),
      location: document.getElementById('screen-location'),
      death:    document.getElementById('screen-death'),
    };

    // HUD elements
    this.hudEl       = document.getElementById('game-ui');
    this.moneyEl     = document.getElementById('stat-money');
    this.knowledgeEl = document.getElementById('stat-knowledge');
    this.happinessEl = document.getElementById('stat-happiness');
    this.healthEl    = document.getElementById('stat-health');
    this.ageEl       = document.getElementById('stat-age');
    this.barHappiness = document.getElementById('bar-happiness');
    this.barHealth    = document.getElementById('bar-health');

    this.locationNameEl = document.getElementById('location-name');
    this.btnBackMap     = document.getElementById('btn-back-map');
    this.jobTitleEl     = document.getElementById('job-title-display');
    this.jobSalaryEl    = document.getElementById('job-salary-display');
    this.jobStatusEl    = document.getElementById('job-status');
    this.monthIndicator = document.getElementById('month-indicator');
    this.monthText      = document.getElementById('month-text');
    this.notifArea      = document.getElementById('notifications');
    this.interactHints  = document.getElementById('interaction-hints');

    // Decision card elements
    this.decisionOverlay = document.getElementById('decision-overlay');
    this.cardTitle       = document.getElementById('card-title');
    this.cardDesc        = document.getElementById('card-description');
    this.cardOptions     = document.getElementById('card-options');
    this.cardLocationTag = document.getElementById('card-location-tag');

    // Action overlay elements
    this.actionOverlay   = document.getElementById('action-overlay');
    this.actionEmoji     = document.getElementById('action-emoji');
    this.actionText      = document.getElementById('action-text');
    this.actionStatsLive = document.getElementById('action-stats-live');
    this.actionProgress  = document.getElementById('action-progress-bar');

    // Death screen
    this.sumMoney    = document.getElementById('sum-money');
    this.sumKnow     = document.getElementById('sum-knowledge');
    this.sumHappy    = document.getElementById('sum-happiness');
    this.sumHealth   = document.getElementById('sum-health');
    this.sumScore    = document.getElementById('sum-score');
    this.sumAchieve  = document.getElementById('sum-achievements');
    this.sumRel      = document.getElementById('sum-relationships');
    this.sumCareer   = document.getElementById('sum-career');
    this.deathTitle  = document.getElementById('death-title');
    this.deathSub    = document.getElementById('death-subtitle');

    // Notification timer
    this._notifTimer = null;

    this._setupCharacterCreate();
    this._setupLocationSelect();
  }

  /* ═══════════════════════════════════════════════════════════
     SCREEN MANAGEMENT
     ═══════════════════════════════════════════════════════════ */
  showScreen(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[name]) {
      this.screens[name].classList.add('active');
    }
  }

  hideAllScreens() {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
  }

  showGameUI() {
    this.hudEl.classList.remove('hidden');
    this.jobStatusEl.classList.remove('hidden');
    this.monthIndicator.classList.remove('hidden');
  }

  hideGameUI() {
    this.hudEl.classList.add('hidden');
    this.jobStatusEl.classList.add('hidden');
    this.monthIndicator.classList.add('hidden');
  }

  /* ═══════════════════════════════════════════════════════════
     HUD UPDATES
     ═══════════════════════════════════════════════════════════ */
  updateHUD(stats) {
    this.moneyEl.textContent     = formatMoney(stats.money);
    this.knowledgeEl.textContent = Math.round(stats.knowledge);
    this.happinessEl.textContent = Math.round(stats.happiness);
    this.healthEl.textContent    = Math.round(stats.health);
    this.ageEl.textContent       = Math.floor(stats.age);

    // Update bars
    this.barHappiness.style.width = `${clamp(stats.happiness, 0, 100)}%`;
    this.barHealth.style.width    = `${clamp(stats.health, 0, 100)}%`;

    // Color money red if in debt
    document.getElementById('hud-money').style.color =
      stats.money < 0 ? '#EF9A9A' : 'var(--gold)';

    // Month display
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthInYear = stats.months % 12;
    const year = Math.floor(stats.months / 12);
    this.monthText.textContent = `${monthNames[monthInYear]} — Year ${year + 1}`;
  }

  updateJobDisplay(careerSystem) {
    if (careerSystem.isEmployed()) {
      const job = careerSystem.currentJob;
      this.jobTitleEl.textContent   = job.title;
      this.jobSalaryEl.textContent  = formatMoney(job.salary) + '/mo';
    } else {
      this.jobTitleEl.textContent  = 'Unemployed';
      this.jobSalaryEl.textContent = 'No income';
    }
  }

  setLocationLabel(label) {
    this.locationNameEl.textContent = label;
  }

  showBackButton() {
    this.btnBackMap.classList.remove('hidden');
  }

  hideBackButton() {
    this.btnBackMap.classList.add('hidden');
  }

  showInteractionHints() {
    this.interactHints.classList.remove('hidden');
  }

  hideInteractionHints() {
    this.interactHints.classList.add('hidden');
  }

  /* ═══════════════════════════════════════════════════════════
     NOTIFICATIONS
     ═══════════════════════════════════════════════════════════ */
  notify(message, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    this.notifArea.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  notifyStatChanges(changes) {
    const parts = [];
    if (changes.money    && changes.money    !== 0) parts.push(`${changes.money > 0 ? '+' : ''}${formatMoney(changes.money)}`);
    if (changes.knowledge && changes.knowledge !== 0) parts.push(`${changes.knowledge > 0 ? '+' : ''}${changes.knowledge} Knowledge`);
    if (changes.happiness && changes.happiness !== 0) parts.push(`${changes.happiness > 0 ? '+' : ''}${changes.happiness} Happiness`);
    if (changes.health   && changes.health   !== 0) parts.push(`${changes.health > 0 ? '+' : ''}${changes.health} Health`);

    if (parts.length > 0) {
      const totalDelta = (changes.money || 0) + (changes.knowledge || 0) * 100 + (changes.happiness || 0) + (changes.health || 0);
      const type = totalDelta >= 0 ? 'pos' : 'neg';
      this.notify(parts.join('  ·  '), type, 2500);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     DECISION CARD
     ═══════════════════════════════════════════════════════════ */
  showDecisionCard(card, locationId, onChoice, playerKnowledge = 0) {
    const locData = LOCATION_DATA[locationId] || {};
    this.cardLocationTag.textContent = `${locData.icon || '🎯'} ${locData.label || locationId}`;
    this.cardTitle.textContent       = card.title;
    this.cardDesc.textContent        = card.description;

    this.cardOptions.innerHTML = '';
    card.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'card-option';

      // Check if locked by knowledge requirement
      const isLocked = card.requiresKnowledge && i > 0 &&
        playerKnowledge < CONFIG.KNOWLEDGE_SOFT_ENTRY;

      if (isLocked) {
        btn.className += ' locked';
        btn.disabled = true;
      }

      btn.innerHTML = `${opt.text}${opt.subtext ? `<span class="option-sub">${opt.subtext}</span>` : ''}`;
      btn.addEventListener('click', () => {
        if (!isLocked) onChoice(i);
      });
      this.cardOptions.appendChild(btn);
    });

    this.decisionOverlay.classList.remove('hidden');
  }

  hideDecisionCard() {
    this.decisionOverlay.classList.add('hidden');
  }

  /* ═══════════════════════════════════════════════════════════
     ACTION ANIMATION OVERLAY
     ═══════════════════════════════════════════════════════════ */
  showActionAnimation(triggerId, effectsToShow, onComplete) {
    const animData = ACTION_ANIM_DATA[triggerId] || ACTION_ANIM_DATA.random_events;
    this.actionEmoji.textContent = animData.emoji;
    this.actionText.textContent  = animData.text;
    this.actionStatsLive.innerHTML = '';
    this.actionProgress.style.width = '0%';

    this.actionOverlay.classList.remove('hidden');

    // Show stat changes progressively
    const keys = Object.keys(effectsToShow).filter(k =>
      effectsToShow[k] !== 0 && ['money','knowledge','happiness','health'].includes(k)
    );

    const duration = CONFIG.ACTION_DURATION;
    let startTime = null;
    let completed = false;

    // Stat change elements appear with stagger
    keys.forEach((key, i) => {
      setTimeout(() => {
        if (completed) return;
        const val = effectsToShow[key];
        const span = document.createElement('span');
        span.className = `stat-change ${val >= 0 ? 'pos' : 'neg'}`;
        const icons = { money: '$', knowledge: '📚', happiness: '☀', health: '♥' };
        span.textContent = `${val >= 0 ? '+' : ''}${key === 'money' ? formatMoney(val) : val} ${icons[key] || key}`;
        this.actionStatsLive.appendChild(span);
      }, (i + 1) * 400);
    });

    const tick = (time) => {
      if (completed) return;
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.actionProgress.style.width = `${progress * 100}%`;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        completed = true;
        this.hideActionAnimation();
        onComplete();
      }
    };
    requestAnimationFrame(tick);

    // Skip button
    const skipBtn = document.getElementById('btn-skip-action');
    const skipHandler = () => {
      completed = true;
      this.hideActionAnimation();
      onComplete();
      skipBtn.removeEventListener('click', skipHandler);
    };
    skipBtn.addEventListener('click', skipHandler);
  }

  hideActionAnimation() {
    this.actionOverlay.classList.add('hidden');
  }

  /* ═══════════════════════════════════════════════════════════
     DEATH SCREEN
     ═══════════════════════════════════════════════════════════ */
  showDeathScreen(stats, characterState, npcSystem, careerSystem) {
    const age = Math.floor(stats.age);
    const byAge    = stats.diedByAge();
    const byHealth = stats.diedByHealth();

    this.deathTitle.textContent = byAge    ? 'A Life Fully Lived'  :
                                  byHealth ? 'Gone Too Soon'        : 'The End';

    this.deathSub.textContent = byAge
      ? `${characterState.name} passed peacefully at age ${age}.`
      : `${characterState.name} died at age ${age}.`;

    this.sumMoney.textContent    = formatMoney(stats.money);
    this.sumKnow.textContent     = Math.round(stats.knowledge);
    this.sumHappy.textContent    = Math.round(stats.happiness);
    this.sumHealth.textContent   = Math.round(stats.health);
    this.sumScore.textContent    = stats.calcLifeScore();

    // Achievements
    this.sumAchieve.innerHTML = '';
    characterState.achievements.forEach(ach => {
      const badge = document.createElement('span');
      badge.className = 'achievement-badge';
      badge.textContent = ach;
      this.sumAchieve.appendChild(badge);
    });
    if (characterState.achievements.length === 0) {
      this.sumAchieve.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">No major achievements</span>';
    }

    // Relationships
    const partner = npcSystem.getPartner();
    const friends = npcSystem.getFriends();
    let relText = '';
    if (partner) relText += `❤️ Loved ${partner.name}. `;
    if (friends.length > 0) relText += `🤝 Friends with ${friends.map(f => f.name).join(', ')}.`;
    this.sumRel.textContent = relText || 'Lived mostly alone.';

    // Career
    const job = careerSystem.currentJob;
    const jobsHeld = characterState.jobsHeld;
    this.sumCareer.textContent = jobsHeld.length > 0
      ? `💼 Career: ${jobsHeld.map(j => j.title).join(' → ')}. Last job: ${job.title} at ${job.company || 'N/A'}.`
      : '💼 Never held a formal job.';

    this.showScreen('death');
  }

  /* ═══════════════════════════════════════════════════════════
     CHARACTER CREATION
     ═══════════════════════════════════════════════════════════ */
  _setupCharacterCreate() {
    // Skin color swatches
    document.querySelectorAll('#skin-options .color-swatch').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#skin-options .color-swatch').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        this.onCreateChange?.();
      });
    });

    // Hair style
    document.querySelectorAll('#hair-style-options .style-btn').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#hair-style-options .style-btn').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        this.onCreateChange?.();
      });
    });

    // Hair color
    document.querySelectorAll('#hair-options .color-swatch').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#hair-options .color-swatch').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        this.onCreateChange?.();
      });
    });

    // Outfit color
    document.querySelectorAll('#outfit-options .color-swatch').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#outfit-options .color-swatch').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        this.onCreateChange?.();
      });
    });

    // Name input
    document.getElementById('char-name').addEventListener('input', () => {
      this.onCreateChange?.();
    });
  }

  getCharacterCustomization() {
    const skinSel    = document.querySelector('#skin-options .color-swatch.selected');
    const hairStyle  = document.querySelector('#hair-style-options .style-btn.selected');
    const hairColor  = document.querySelector('#hair-options .color-swatch.selected');
    const outfitColor = document.querySelector('#outfit-options .color-swatch.selected');
    const name       = document.getElementById('char-name').value.trim() || 'Player';

    return {
      name,
      skinKey:      skinSel?.dataset.value     || 'skin1',
      hairStyle:    hairStyle?.dataset.value   || 'A',
      hairColorKey: hairColor?.dataset.value   || 'h1',
      outfitKey:    outfitColor?.dataset.value || 'o1',
    };
  }

  /* ═══════════════════════════════════════════════════════════
     LOCATION SELECT
     ═══════════════════════════════════════════════════════════ */
  _setupLocationSelect() {
    let selectedLocation = null;
    const confirmBtn = document.getElementById('btn-location-done');

    document.querySelectorAll('.loc-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.loc-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedLocation = card.dataset.location;
        confirmBtn.classList.remove('hidden');
        this._selectedLocation = selectedLocation;
      });
    });
  }

  getSelectedLocation() {
    return this._selectedLocation || 'suburb';
  }

  /* ─── Career notification ─── */
  onCareerEvent(ev) {
    if (ev.type === 'promotion') {
      this.notify(`🎉 Promoted to ${ev.job.title}!`, 'pos', 4000);
    } else if (ev.type === 'new_job') {
      this.notify(`💼 Started as ${ev.job.title}`, 'info', 3000);
    } else if (ev.type === 'job_lost') {
      const reason = ev.reason === 'downsizing' ? 'Company downsizing 😔' : 'Lost your job 😔';
      this.notify(reason, 'neg', 4000);
    }
  }

  onNPCEvent(ev) {
    if (ev.type === 'romance_start') {
      this.notify(`❤️ You're now in a relationship with ${ev.npc.name}!`, 'pos', 4000);
    } else if (ev.type === 'romance_end') {
      this.notify(`💔 Your relationship with ${ev.name} ended.`, 'neg', 4000);
    } else if (ev.type === 'new_friend') {
      this.notify(`🤝 ${ev.npc.name} is now a close friend!`, 'pos', 3000);
    }
  }
}
