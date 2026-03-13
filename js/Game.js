/* ═══════════════════════════════════════════════════════════
   OTTO — Main Game Controller
   State machine that orchestrates all systems
   ═══════════════════════════════════════════════════════════ */
'use strict';

const GamePhase = {
  TITLE:       'TITLE',
  CREATE:      'CREATE',
  LOCATION:    'LOCATION',
  MAP:         'MAP',
  WALKING:     'WALKING',
  ROOM:        'ROOM',
  DECISION:    'DECISION',
  ACTION:      'ACTION',
  DEATH:       'DEATH',
};

class Game {
  constructor() {
    this.phase           = GamePhase.TITLE;
    this.currentLocation = 'home';
    this.renderer        = null;
    this.mapScene        = null;
    this.roomScene       = null;

    // Core systems
    this.stats          = null;
    this.characterState = null;
    this.npcSystem      = null;
    this.careerSystem   = null;
    this.decisionSystem = null;
    this.ui             = null;

    // Active card
    this.activeCard     = null;

    // Weather
    this.weatherTimer   = 0;
    this.weatherIndex   = 0;

    // Auto-save interval
    this.saveInterval   = null;

    // RAF handle
    this._rafId         = null;
    this._lastTime      = null;
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════ */
  init() {
    this.ui = new UI();

    // Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('gameCanvas'),
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Title screen
    this._setupTitleScreen();

    // Handle resize
    window.addEventListener('resize', () => this._onResize());

    // Start render loop
    this._startRenderLoop();

    // Check for saved game
    if (Storage.hasSave()) {
      document.getElementById('btn-continue').classList.remove('hidden');
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TITLE SCREEN
     ═══════════════════════════════════════════════════════════ */
  _setupTitleScreen() {
    document.getElementById('btn-new-game').addEventListener('click', () => {
      Storage.clear();
      this._goToCreate();
    });

    document.getElementById('btn-continue').addEventListener('click', () => {
      this._loadAndContinue();
    });
  }

  _goToCreate() {
    this.phase = GamePhase.CREATE;
    this.ui.showScreen('create');

    // Set up preview canvas
    this._initPreviewCanvas();

    document.getElementById('btn-create-done').addEventListener('click', () => {
      this._goToLocationSelect();
    }, { once: true });
  }

  /* ═══════════════════════════════════════════════════════════
     CHARACTER CREATION PREVIEW
     ═══════════════════════════════════════════════════════════ */
  _initPreviewCanvas() {
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');

    const drawPreview = () => {
      const cust = this.ui.getCharacterCustomization();
      ctx.clearRect(0, 0, 220, 320);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, 320);
      bg.addColorStop(0, '#1a2a3a');
      bg.addColorStop(1, '#0d1520');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 220, 320);

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(110, 285, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      const skinHex = CONFIG.SKIN_COLORS[cust.skinKey] || 0xFDDCB5;
      const hairHex = CONFIG.HAIR_COLORS[cust.hairColorKey] || 0x2C1A0E;
      const outfitHex = CONFIG.OUTFIT_COLORS[cust.outfitKey] || 0x3B5998;

      const toRGBA = (hex, a = 1) => {
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        return `rgba(${r},${g},${b},${a})`;
      };

      const skin   = toRGBA(skinHex);
      const hair   = toRGBA(hairHex);
      const outfit = toRGBA(outfitHex);
      const dark   = toRGBA(outfitHex, 0.7);
      const pants  = toRGBA(Math.max(0, outfitHex - 0x202020));

      const cx = 110, by = 275;

      // ── Feet ──
      ctx.fillStyle = '#222';
      ctx.fillRect(cx - 22, by - 22, 18, 12);
      ctx.fillRect(cx + 4, by - 22, 18, 12);

      // ── Legs ──
      ctx.fillStyle = dark;
      ctx.fillRect(cx - 20, by - 80, 16, 60);
      ctx.fillRect(cx + 4, by - 80, 16, 60);

      // ── Torso ──
      const bodyGrad = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0);
      bodyGrad.addColorStop(0, outfit);
      bodyGrad.addColorStop(1, dark);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(cx - 30, by - 155, 60, 75, 6);
      ctx.fill();

      // ── Arms ──
      ctx.fillStyle = outfit;
      ctx.fillRect(cx - 48, by - 155, 18, 40);
      ctx.fillRect(cx + 30, by - 155, 18, 40);
      ctx.fillStyle = skin;
      ctx.fillRect(cx - 46, by - 115, 16, 30);
      ctx.fillRect(cx + 30, by - 115, 16, 30);

      // ── Hands ──
      ctx.beginPath();
      ctx.ellipse(cx - 38, by - 83, 10, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = skin; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 38, by - 83, 10, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── Neck ──
      ctx.fillStyle = skin;
      ctx.fillRect(cx - 10, by - 168, 20, 16);

      // ── Head ──
      ctx.beginPath();
      ctx.ellipse(cx, by - 205, 32, 36, 0, 0, Math.PI * 2);
      ctx.fillStyle = skin; ctx.fill();

      // ── Hair ──
      ctx.fillStyle = hair;
      if (cust.hairStyle === 'A') {
        // Short
        ctx.beginPath();
        ctx.ellipse(cx, by - 226, 33, 20, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (cust.hairStyle === 'B') {
        // Medium
        ctx.beginPath();
        ctx.ellipse(cx, by - 228, 33, 18, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 34, by - 226, 8, 22);
        ctx.fillRect(cx + 26, by - 226, 8, 22);
      } else if (cust.hairStyle === 'C') {
        // Long
        ctx.beginPath();
        ctx.ellipse(cx, by - 228, 33, 20, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 35, by - 226, 10, 55);
        ctx.fillRect(cx + 25, by - 226, 10, 55);
      }

      // ── Eyes ──
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx - 12, by - 210, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 12, by - 210, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.ellipse(cx - 11, by - 210, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 11, by - 210, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // ── Nose ──
      ctx.strokeStyle = toRGBA(skinHex - 0x181818);
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 3, by - 205); ctx.lineTo(cx, by - 196); ctx.lineTo(cx + 3, by - 205);
      ctx.stroke();

      // ── Name label ──
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '700 14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cust.name || 'Player', cx, by + 20);
    };

    this.ui.onCreateChange = drawPreview;
    drawPreview();
  }

  /* ═══════════════════════════════════════════════════════════
     LOCATION SELECT
     ═══════════════════════════════════════════════════════════ */
  _goToLocationSelect() {
    this.phase = GamePhase.LOCATION;
    this.ui.showScreen('location');

    document.getElementById('btn-location-done').addEventListener('click', () => {
      const location = this.ui.getSelectedLocation();
      this._startGame(location);
    }, { once: true });
  }

  /* ═══════════════════════════════════════════════════════════
     START GAME
     ═══════════════════════════════════════════════════════════ */
  _startGame(startingLocation) {
    // Init systems
    const startStats = CONFIG.STARTING_STATS[startingLocation] || CONFIG.STARTING_STATS.suburb;
    this.stats          = new Stats(startStats);
    this.characterState = new CharacterState();
    this.npcSystem      = new NPCSystem();
    this.careerSystem   = new CareerSystem();

    // Apply character customization
    const cust = this.ui.getCharacterCustomization();
    this.characterState.applyCustomization(cust);

    this.decisionSystem = new DecisionSystem(
      this.stats, this.characterState, this.npcSystem, this.careerSystem
    );

    this._hookSystemListeners();
    this._initScenes();
    this._enterMap();

    // Auto-save every 30 seconds
    this.saveInterval = setInterval(() => this._save(), 30000);
  }

  _hookSystemListeners() {
    this.stats.onChange((changes) => {
      this.ui.updateHUD(this.stats);
      if (changes.monthAdvanced) {
        this.ui.updateJobDisplay(this.careerSystem);
      }
    });

    this.careerSystem.onChange((ev) => {
      this.ui.onCareerEvent(ev);
      this.ui.updateJobDisplay(this.careerSystem);
      if (ev.type === 'promotion' || ev.type === 'new_job') {
        this.characterState.recordJob(ev.job.title, ev.job.company);
      }
    });

    this.npcSystem.onChange((ev) => {
      this.ui.onNPCEvent(ev);
    });
  }

  _initScenes() {
    const charModel = new CharacterModel(this.characterState, this.stats);

    this.mapScene = new MapScene(this.renderer, charModel, this.npcSystem);
    this.roomScene = new RoomScene(this.renderer, charModel, this.npcSystem);

    this.characterModel = charModel;
  }

  /* ═══════════════════════════════════════════════════════════
     PHASE: MAP
     ═══════════════════════════════════════════════════════════ */
  _enterMap() {
    this.phase = GamePhase.MAP;
    this.ui.hideAllScreens();
    this.ui.showGameUI();
    this.ui.hideBackButton();
    this.ui.hideInteractionHints();
    this.ui.setLocationLabel('🗺 City Map');
    this.ui.updateHUD(this.stats);
    this.ui.updateJobDisplay(this.careerSystem);

    // Set weather
    const weather = WEATHER_TYPES[this.weatherIndex % WEATHER_TYPES.length];
    this.mapScene.setWeather(weather);

    // Canvas click handler
    this._tapHandler = (e) => this._onMapTap(e);
    document.getElementById('gameCanvas').addEventListener('click', this._tapHandler);
    document.getElementById('gameCanvas').addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this._onMapTap({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });
  }

  _onMapTap(e) {
    if (this.phase !== GamePhase.MAP) return;
    const locationId = this.mapScene.onTap(e.clientX, e.clientY);
    if (locationId) {
      this._navigateToLocation(locationId);
    }
  }

  _navigateToLocation(locationId) {
    const pos = CONFIG.LOCATION_POSITIONS[locationId];
    if (!pos) return;

    // Check if office requires a job
    if (locationId === 'office' && !this.careerSystem.isEmployed()) {
      this.ui.notify('You need a job to go to the office. Apply at the café or home desk.', 'info', 3500);
      return;
    }

    this.phase = GamePhase.WALKING;
    this.ui.setLocationLabel(`Walking to ${LOCATION_DATA[locationId]?.label || locationId}...`);

    const target = new THREE.Vector3(pos.x, 0, pos.z);
    this.characterModel.walkTo(target, () => {
      this._enterRoom(locationId);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     PHASE: ROOM
     ═══════════════════════════════════════════════════════════ */
  _enterRoom(locationId) {
    this.currentLocation = locationId;
    this.phase = GamePhase.ROOM;

    // Remove map canvas listener
    document.getElementById('gameCanvas').removeEventListener('click', this._tapHandler);

    // Load room scene
    this.roomScene.loadRoom(locationId, this.characterState, this.stats);
    this.characterState.recordVisit(locationId);

    const locData = LOCATION_DATA[locationId] || {};
    this.ui.setLocationLabel(`${locData.icon || ''} ${locData.label || locationId}`);
    this.ui.showBackButton();
    this.ui.showInteractionHints();

    // Set up back button
    const backBtn = document.getElementById('btn-back-map');
    backBtn.onclick = () => this._exitRoom();

    // Set up room tap handler
    this._roomTapHandler = (e) => this._onRoomTap(e);
    document.getElementById('gameCanvas').addEventListener('click', this._roomTapHandler);
    document.getElementById('gameCanvas').addEventListener('touchend', (ev) => {
      ev.preventDefault();
      const t = ev.changedTouches[0];
      this._onRoomTap({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });

    // Show arrival notification
    if (locData.ambientDesc) {
      setTimeout(() => this.ui.notify(locData.ambientDesc, 'info', 2500), 300);
    }
  }

  _onRoomTap(e) {
    if (this.phase !== GamePhase.ROOM) return;
    const triggerId = this.roomScene.onTap(e.clientX, e.clientY);
    if (triggerId) {
      this._triggerDecision(triggerId);
    }
  }

  _exitRoom() {
    document.getElementById('gameCanvas').removeEventListener('click', this._roomTapHandler);
    this.ui.hideBackButton();
    this.ui.hideInteractionHints();
    this._enterMap();
  }

  /* ═══════════════════════════════════════════════════════════
     PHASE: DECISION
     ═══════════════════════════════════════════════════════════ */
  _triggerDecision(triggerId) {
    const card = this.decisionSystem.getCardForTrigger(triggerId, this.currentLocation);
    if (!card) {
      this.ui.notify('Nothing to do here right now.', 'info', 1500);
      return;
    }

    this.phase = GamePhase.DECISION;
    this.activeCard = card;
    this.ui.hideInteractionHints();

    this.ui.showDecisionCard(card, this.currentLocation, (optionIndex) => {
      this.ui.hideDecisionCard();
      this._resolveDecision(optionIndex);
    });

    // Skip card option
    document.getElementById('btn-skip-card').onclick = () => {
      this.ui.hideDecisionCard();
      this.phase = GamePhase.ROOM;
      this.ui.showInteractionHints();
    };
  }

  _resolveDecision(optionIndex) {
    const card   = this.activeCard;
    const result = this.decisionSystem.evaluateChoice(card, optionIndex);
    if (!result) {
      this.phase = GamePhase.ROOM;
      return;
    }

    this.phase = GamePhase.ACTION;

    // Show action animation
    this.ui.showActionAnimation(
      this.currentLocation,
      result.effects,
      () => {
        // Apply effects after animation
        this.decisionSystem.applyResult(result);

        // Advance time
        this.stats.advanceMonth();
        this.careerSystem.advanceMonth(this.stats);
        this.weatherTimer++;
        if (this.weatherTimer >= 6) {
          this.weatherTimer = 0;
          this.weatherIndex++;
          const weather = WEATHER_TYPES[this.weatherIndex % WEATHER_TYPES.length];
          this.mapScene.setWeather(weather);
        }

        // Show result messages
        result.messages.forEach(msg => {
          setTimeout(() => this.ui.notify(msg, result.success ? 'pos' : 'neg', 2500), 200);
        });

        // Notify stat changes
        this.ui.notifyStatChanges(result.effects);

        // Update HUD
        this.ui.updateHUD(this.stats);
        this.ui.updateJobDisplay(this.careerSystem);

        // Update character aging
        this.characterModel.updateAging(this.stats.age);

        // Check achievements
        this.decisionSystem.checkAchievements();

        // Auto-save
        this._save();

        // Check death
        if (!this.stats.isAlive()) {
          this._triggerDeath();
          return;
        }

        // Return to room
        this.phase = GamePhase.ROOM;
        this.ui.showInteractionHints();
      }
    );
  }

  /* ═══════════════════════════════════════════════════════════
     DEATH
     ═══════════════════════════════════════════════════════════ */
  _triggerDeath() {
    this.phase = GamePhase.DEATH;
    document.getElementById('gameCanvas').removeEventListener('click', this._roomTapHandler);
    document.getElementById('gameCanvas').removeEventListener('click', this._tapHandler);
    this.ui.hideGameUI();

    // Final achievement check
    this.decisionSystem.checkAchievements();

    setTimeout(() => {
      this.ui.showDeathScreen(
        this.stats,
        this.characterState,
        this.npcSystem,
        this.careerSystem
      );
      Storage.clear();
      clearInterval(this.saveInterval);
    }, 1000);

    // New life button
    document.getElementById('btn-new-life').onclick = () => {
      location.reload();
    };
  }

  /* ═══════════════════════════════════════════════════════════
     LOAD & CONTINUE
     ═══════════════════════════════════════════════════════════ */
  _loadAndContinue() {
    const data = Storage.load();
    if (!data) { this._goToCreate(); return; }

    this.stats          = new Stats(CONFIG.STARTING_STATS.suburb);
    this.characterState = new CharacterState();
    this.npcSystem      = new NPCSystem();
    this.careerSystem   = new CareerSystem();

    this.stats.restore(data.stats);
    this.characterState.restore(data.character);
    this.npcSystem.restore(data.npcs);
    this.careerSystem.restore(data.career);

    this.decisionSystem = new DecisionSystem(
      this.stats, this.characterState, this.npcSystem, this.careerSystem
    );

    this._hookSystemListeners();
    this._initScenes();
    this._enterMap();

    this.saveInterval = setInterval(() => this._save(), 30000);
    this.ui.notify('Game loaded!', 'info', 2000);
  }

  /* ═══════════════════════════════════════════════════════════
     SAVE
     ═══════════════════════════════════════════════════════════ */
  _save() {
    if (!this.stats) return;
    Storage.save(
      this.stats,
      this.characterState,
      this.npcSystem,
      this.careerSystem,
      this.currentLocation,
      this.phase
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER LOOP
     ═══════════════════════════════════════════════════════════ */
  _startRenderLoop() {
    const loop = (time) => {
      this._rafId = requestAnimationFrame(loop);
      const dt = this._lastTime ? Math.min((time - this._lastTime) / 1000, 0.05) : 0.016;
      this._lastTime = time;

      switch (this.phase) {
        case GamePhase.MAP:
        case GamePhase.WALKING:
          this.mapScene?.update(dt, this.stats || { age: 18, happiness: 75, health: 80 });
          this.mapScene?.render();
          break;

        case GamePhase.ROOM:
        case GamePhase.DECISION:
        case GamePhase.ACTION:
          this.roomScene?.update(dt, this.stats || { age: 18, happiness: 75, health: 80 });
          this.roomScene?.render();
          break;

        default:
          // Title / Create / Location / Death — nothing to render on canvas
          // (canvas is behind screens, draw a static placeholder)
          if (this.renderer) {
            const gl = this.renderer.getContext();
            gl.clearColor(0.04, 0.04, 0.1, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
          }
          break;
      }
    };
    requestAnimationFrame(loop);
  }

  /* ═══════════════════════════════════════════════════════════
     RESIZE
     ═══════════════════════════════════════════════════════════ */
  _onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.mapScene?.onResize();
    this.roomScene?.onResize();
  }
}
