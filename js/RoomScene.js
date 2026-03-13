/* ═══════════════════════════════════════════════════════════
   OTTO — Room Scene (Three.js)
   Interior views for each location with interactable objects
   ═══════════════════════════════════════════════════════════ */
'use strict';

class RoomScene {
  constructor(renderer, characterModel, npcSystem) {
    this.renderer       = renderer;
    this.characterModel = characterModel;
    this.npcSystem      = npcSystem;

    this.scene          = new THREE.Scene();
    this.camera         = null;
    this.raycaster      = new THREE.Raycaster();
    this.mouse          = new THREE.Vector2();

    this.currentLocation = null;
    this.interactables   = []; // { mesh, triggerId, label }
    this.npcMeshes       = [];
    this.highlightMeshes = [];
    this.animTime        = 0;

    this._buildCamera();
  }

  /* ─── Camera — isometric room view ─── */
  _buildCamera() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const d = 8;
    this.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect, d, -d, 0.1, 100
    );
    this.camera.position.set(12, 12, 12);
    this.camera.lookAt(0, 1, 0);
  }

  /* ═══════════════════════════════════════════════════════════
     LOAD ROOM for a given locationId
     ═══════════════════════════════════════════════════════════ */
  loadRoom(locationId, characterState, stats) {
    // Clear current scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.interactables  = [];
    this.npcMeshes      = [];
    this.highlightMeshes = [];

    this.currentLocation = locationId;

    // Ambient light (warmer for rooms)
    const ambient = new THREE.AmbientLight(0xFFF8E1, 0.8);
    this.scene.add(ambient);

    // Point light (room lamp)
    const lamp = new THREE.PointLight(0xFFE0B2, 1.2, 18);
    lamp.position.set(0, 5, 0);
    lamp.castShadow = true;
    this.scene.add(lamp);

    // Directional fill
    const fill = new THREE.DirectionalLight(0xCCDDFF, 0.4);
    fill.position.set(-5, 8, 5);
    this.scene.add(fill);

    // Build the specific room
    switch (locationId) {
      case 'home':    this._buildHome(characterState, stats); break;
      case 'office':  this._buildOfficeRoom(characterState); break;
      case 'gym':     this._buildGymRoom(characterState); break;
      case 'cafe':    this._buildCafeRoom(characterState); break;
      case 'park':    this._buildParkRoom(characterState); break;
      case 'library': this._buildLibraryRoom(characterState); break;
      default:        this._buildHome(characterState, stats); break;
    }

    // Position character at room entrance
    this.characterModel.group.position.set(0, 0, 2.5);
    this.characterModel.group.rotation.y = Math.PI;
    this.characterModel.setAnimation('idle');
    this.scene.add(this.characterModel.group);

    // Update outfit
    const outfitType = LOCATION_DATA[locationId]?.outfitType || 'casual';
    this.characterModel.setOutfitForLocation(outfitType);
  }

  /* ─── ROOM SHELL: floor, walls, ceiling ─── */
  _buildRoomShell(floorColor, wallColor, ceilColor = 0xFAFAFA) {
    const floorMat = new THREE.MeshLambertMaterial({ color: floorColor });
    const wallMat  = new THREE.MeshLambertMaterial({ color: wallColor });
    const ceilMat  = new THREE.MeshLambertMaterial({ color: ceilColor });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallMat);
    backWall.position.set(0, 3, -5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-5, 3, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 6;
    this.scene.add(ceil);

    // Baseboard trim
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    [
      { p: [0, 0.05, -4.95], r: [0, 0, 0], s: [10, 0.12, 0.08] },
      { p: [-4.95, 0.05, 0], r: [0, Math.PI/2, 0], s: [10, 0.12, 0.08] },
    ].forEach(({ p, r, s }) => {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(...s), trimMat);
      trim.position.set(...p);
      trim.rotation.set(...r);
      this.scene.add(trim);
    });

    // Ceiling crown
    const crown = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.12, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xEEEEEE }));
    crown.position.set(0, 5.94, -4.95); this.scene.add(crown);
  }

  _addInteractable(mesh, triggerId, label) {
    this.interactables.push({ mesh, triggerId, label });
    // Add glow indicator (small colored ring)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.35, 16),
      new THREE.MeshBasicMaterial({ color: 0xFFD740, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(mesh.position);
    ring.position.y = 0.05;
    ring.userData.isIndicator = true;
    this.scene.add(ring);
    this.highlightMeshes.push(ring);
  }

  /* ═══════════════════════════════════════════════════════════
     HOME ROOM
     ═══════════════════════════════════════════════════════════ */
  _buildHome(characterState, stats) {
    this.scene.background = new THREE.Color(0xFFF8F0);
    this._buildRoomShell(0xE8D5B7, 0xF5EFE7);

    // Rug
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4, 3),
      new THREE.MeshLambertMaterial({ color: 0x8B4040 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(-1, 0.01, 0.5); this.scene.add(rug);

    // ── DESK (interactable) ──
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    desk.position.set(-2.0, 0.75, -3.0);
    desk.castShadow = true; desk.receiveShadow = true;
    this.scene.add(desk);
    desk.userData.clickable = true;

    // Desk legs
    [[0.9, -0.42], [-0.9, -0.42]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x6D4C41 }));
      leg.position.set(desk.position.x + x, 0.37, desk.position.z + z);
      this.scene.add(leg);
    });

    // Computer monitor
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x212121 }));
    monitor.position.set(-2.0, 1.2, -3.3);
    this.scene.add(monitor);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.03),
      new THREE.MeshLambertMaterial({ color: 0x1565C0, emissive: 0x0D47A1, emissiveIntensity: 0.3 }));
    screen.position.set(-2.0, 1.2, -3.26); this.scene.add(screen);

    // Monitor stand
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x212121 }));
    stand.position.set(-2.0, 0.97, -3.3); this.scene.add(stand);

    // Keyboard
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.25),
      new THREE.MeshLambertMaterial({ color: 0x424242 }));
    keyboard.position.set(-2.0, 0.82, -2.82); this.scene.add(keyboard);

    // Desk chair
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x37474F }));
    chairSeat.position.set(-2.0, 0.55, -2.0); this.scene.add(chairSeat);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x37474F }));
    chairBack.position.set(-2.0, 0.95, -2.32); this.scene.add(chairBack);

    // Desk lamp
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 8),
      new THREE.MeshLambertMaterial({ color: 0xFFD54F }));
    lampBase.position.set(-1.2, 0.84, -3.2); this.scene.add(lampBase);
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6),
      new THREE.MeshLambertMaterial({ color: 0xFFD54F }));
    lampArm.rotation.z = 0.4; lampArm.position.set(-1.12, 1.12, -3.2); this.scene.add(lampArm);

    this._addInteractable(desk, 'home_desk', 'Computer');

    // ── BED ──
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    bedFrame.position.set(2.5, 0.2, -3.5); this.scene.add(bedFrame);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xECEFF1 }));
    mattress.position.set(2.5, 0.45, -3.5); this.scene.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
    pillow.position.set(2.5, 0.63, -4.0); this.scene.add(pillow);

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.8),
      new THREE.MeshLambertMaterial({ color: characterState.outfitColor }));
    blanket.position.set(2.5, 0.62, -3.2); this.scene.add(blanket);

    // Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x6D4C41 }));
    headboard.position.set(2.5, 0.7, -4.08); this.scene.add(headboard);

    // ── BOOKSHELF ──
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, 1.5),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    shelf.position.set(-4.7, 1.0, -2.5); this.scene.add(shelf);

    // Books (colorful)
    const bookColors = [0xC62828, 0x2E7D32, 0x1565C0, 0xE65100, 0x6A1B9A, 0x37474F];
    for (let i = 0; i < 10; i++) {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.08, randFloat(0.2, 0.4), 0.14),
        new THREE.MeshLambertMaterial({ color: pick(bookColors) }));
      book.position.set(-4.56, 0.3 + Math.floor(i / 5) * 0.8 + randFloat(0, 0.15), -2.8 + (i % 5) * 0.2);
      this.scene.add(book);
    }

    // ── WINDOW ──
    const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
    windowFrame.position.set(2.0, 2.5, -4.95); this.scene.add(windowFrame);

    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.6 }));
    windowPane.position.set(2.0, 2.5, -4.9); this.scene.add(windowPane);

    // ── PLANT ──
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 8),
      new THREE.MeshLambertMaterial({ color: 0xBF8C60 }));
    pot.position.set(-4.5, 0.18, -0.5); this.scene.add(pot);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x388E3C }));
    plant.position.set(-4.5, 0.6, -0.5); this.scene.add(plant);
  }

  /* ═══════════════════════════════════════════════════════════
     OFFICE ROOM
     ═══════════════════════════════════════════════════════════ */
  _buildOfficeRoom(characterState) {
    this.scene.background = new THREE.Color(0xECEFF1);
    this._buildRoomShell(0xBDBDBD, 0xECEFF1, 0xF5F5F5);

    // Open office desks
    const deskMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const deskPositions = [[-2.5, -2.5], [0, -2.5], [2.5, -2.5], [-2.5, -0.5]];
    deskPositions.forEach(([x, z], i) => {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.8), deskMat);
      desk.position.set(x, 0.72, z); desk.castShadow = true;
      this.scene.add(desk);

      // Monitor
      const mon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x1A1A2E }));
      mon.position.set(x, 1.07, z - 0.28); this.scene.add(mon);

      // Screen glow
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.03),
        new THREE.MeshLambertMaterial({ color: 0x1565C0, emissive: 0x0D47A1, emissiveIntensity: 0.5 }));
      scr.position.set(x, 1.07, z - 0.25); this.scene.add(scr);

      // Keyboard
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x424242 }));
      kb.position.set(x, 0.78, z + 0.15); this.scene.add(kb);

      if (i === 0) {
        // Player's desk — make it interactable
        desk.userData.clickable = true;
        this._addInteractable(desk, 'office', 'Work Desk');
      }
    });

    // Boss office glass wall
    const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 4.0),
      new THREE.MeshLambertMaterial({ color: 0xB3E5FC, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    glassWall.position.set(-4.95, 2, -1.5); glassWall.rotation.y = Math.PI / 2;
    this.scene.add(glassWall);

    // Water cooler
    const coolerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 1.4, 10),
      new THREE.MeshLambertMaterial({ color: 0x90A4AE }));
    coolerBody.position.set(4.0, 0.7, -3.5); this.scene.add(coolerBody);
    const coolerJug = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 10),
      new THREE.MeshLambertMaterial({ color: 0x29B6F6, transparent: true, opacity: 0.7 }));
    coolerJug.position.set(4.0, 1.65, -3.5); this.scene.add(coolerJug);

    // Conference table (bg)
    const confTable = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x5D4037 }));
    confTable.position.set(2.5, 0.7, 1.5); this.scene.add(confTable);

    // Office plant
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x795548 }));
    pot.position.set(4.2, 0.2, 1.5); this.scene.add(pot);
    const pl = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x2E7D32 }));
    pl.position.set(4.2, 0.65, 1.5); this.scene.add(pl);

    // Window (large office window)
    const win = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.5 }));
    win.position.set(0, 3.0, -4.9); this.scene.add(win);
  }

  /* ═══════════════════════════════════════════════════════════
     GYM ROOM
     ═══════════════════════════════════════════════════════════ */
  _buildGymRoom(characterState) {
    this.scene.background = new THREE.Color(0xFAFAFA);
    this._buildRoomShell(0x78909C, 0xECEFF1, 0xF5F5F5);

    // Rubber mat floor overlay
    const matMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10),
      new THREE.MeshLambertMaterial({ color: 0x263238 }));
    matMesh.rotation.x = -Math.PI / 2; matMesh.position.y = 0.01; this.scene.add(matMesh);

    // Stripe lanes
    [0x1B5E20, 0x1A237E, 0xB71C1C].forEach((c, i) => {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.5),
        new THREE.MeshLambertMaterial({ color: c }));
      stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.02, -3 + i * 3);
      this.scene.add(stripe);
    });

    // ── BENCH PRESS (interactable) ──
    const benchBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x424242 }));
    benchBody.position.set(-2, 0.5, -2.5); this.scene.add(benchBody);

    // Bench legs
    [[-0.8, -0.12], [0.8, -0.12]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x212121 }));
      leg.position.set(-2 + x, 0.25, -2.5 + z); this.scene.add(leg);
    });

    // Barbell bar
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8),
      new THREE.MeshLambertMaterial({ color: 0x9E9E9E }));
    bar.rotation.z = Math.PI / 2; bar.position.set(-2, 1.1, -2.5); this.scene.add(bar);

    // Weights
    [-1.15, 1.15].forEach(x => {
      const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 16),
        new THREE.MeshLambertMaterial({ color: 0x212121 }));
      weight.rotation.z = Math.PI / 2; weight.position.set(-2 + x, 1.1, -2.5);
      this.scene.add(weight);
    });

    const benchMesh = benchBody;
    benchMesh.userData.clickable = true;
    this._addInteractable(benchMesh, 'gym', 'Weight Bench');

    // ── TREADMILL ──
    const treadmill = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x37474F }));
    treadmill.position.set(2.5, 0.2, -2.5); this.scene.add(treadmill);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.55),
      new THREE.MeshLambertMaterial({ color: 0x1A1A1A }));
    belt.position.set(2.5, 0.4, -2.5); this.scene.add(belt);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x212121 }));
    handle.position.set(2.5, 1.1, -2.8); this.scene.add(handle);
    [[-0.5, -2.8], [0.5, -2.8]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6),
        new THREE.MeshLambertMaterial({ color: 0x212121 }));
      post.position.set(2.5 + x, 0.75, z); this.scene.add(post);
    });

    treadmill.userData.clickable = true;
    this._addInteractable(treadmill, 'gym', 'Treadmill');

    // Mirror wall
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 3.5),
      new THREE.MeshLambertMaterial({ color: 0xE0F7FA, transparent: true, opacity: 0.55 }));
    mirror.position.set(0, 2.75, -4.9); this.scene.add(mirror);

    // Dumbbell rack
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x37474F }));
    rack.position.set(-3.5, 0.4, -3.5); this.scene.add(rack);

    const dumbColors = [0xC62828, 0x1565C0, 0x2E7D32];
    for (let i = 0; i < 6; i++) {
      const db = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 6),
        new THREE.MeshLambertMaterial({ color: pick(dumbColors) }));
      db.rotation.z = Math.PI / 2;
      db.position.set(-4.4 + i * 0.45, 0.9, -3.5);
      this.scene.add(db);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     CAFÉ ROOM
     ═══════════════════════════════════════════════════════════ */
  _buildCafeRoom(characterState) {
    this.scene.background = new THREE.Color(0xFFF8E1);
    this._buildRoomShell(0xD7B98E, 0xFFF3E0, 0xFFF9F0);

    // Counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.1, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    counter.position.set(0, 0.55, -3.5); counter.castShadow = true; this.scene.add(counter);

    // Counter top
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x5D4037 }));
    top.position.set(0, 1.14, -3.5); this.scene.add(top);

    // Espresso machine
    const machine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x212121 }));
    machine.position.set(-0.8, 1.42, -3.45); this.scene.add(machine);

    const machineTop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.38),
      new THREE.MeshLambertMaterial({ color: 0x424242 }));
    machineTop.position.set(-0.8, 1.75, -3.45); this.scene.add(machineTop);

    // Cups on counter
    [0.3, 0.6, 0.9].forEach(x => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.12, 8),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
      cup.position.set(x, 1.24, -3.45); this.scene.add(cup);
    });

    // ── TABLES (interactable — for cafe decisions) ──
    const tablePositions = [[-2.5, 0.5], [0, 0.5], [2.5, 0.5], [-2.5, 3.0], [0, 3.0]];
    tablePositions.forEach(([x, z], i) => {
      // Table top
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.08, 12),
        new THREE.MeshLambertMaterial({ color: 0xFFECB3 }));
      tableTop.position.set(x, 0.72, z); this.scene.add(tableTop);

      // Table leg
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 6),
        new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
      leg.position.set(x, 0.36, z); this.scene.add(leg);

      // Chairs
      [[-0.75, 0], [0.75, 0], [0, -0.75]].forEach(([cx, cz]) => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.35),
          new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
        chair.position.set(x + cx, 0.45, z + cz); this.scene.add(chair);
      });

      if (i === 2) {
        tableTop.userData.clickable = true;
        this._addInteractable(tableTop, 'cafe', 'Café Table');
      }
    });

    // Chalkboard menu
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x1A2A1A }));
    board.position.set(-2.5, 2.8, -4.9); this.scene.add(board);

    // Window with warm light
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xFFE082, transparent: true, opacity: 0.5 }));
    win.position.set(3.0, 2.5, -4.9); this.scene.add(win);

    // Add NPC (Jordan) at café
    const npc = this.npcSystem.getNPC('jordan') || this.npcSystem.getNPC('riley');
    if (npc) {
      const model = this._buildSimpleNPC(npc.skinColor, npc.outfitColor);
      model.position.set(2.5, 0, 3.0);
      this.scene.add(model);
      this.npcMeshes.push({ mesh: model, npcId: npc.id });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     PARK ROOM (Outdoor)
     ═══════════════════════════════════════════════════════════ */
  _buildParkRoom(characterState) {
    this.scene.background = new THREE.Color(0x87CEEB);

    // Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20),
      new THREE.MeshLambertMaterial({ color: 0x4CAF50 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);

    // Ambient + sun
    const sun = new THREE.DirectionalLight(0xFFFFCC, 1.3);
    sun.position.set(10, 20, 10); sun.castShadow = true; this.scene.add(sun);
    this.scene.remove(this.scene.children.find(c => c instanceof THREE.AmbientLight));
    this.scene.add(new THREE.AmbientLight(0xCCFFCC, 0.8));

    // Benches (interactable)
    [[0, 1.5], [-2, -2]].forEach(([x, z], i) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.45),
        new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
      bench.position.set(x, 0.48, z); this.scene.add(bench);
      if (i === 0) {
        bench.userData.clickable = true;
        this._addInteractable(bench, 'park', 'Park Bench');
      }
    });

    // Path
    const path = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 10),
      new THREE.MeshLambertMaterial({ color: 0xBCAAA4 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, 0); this.scene.add(path);

    // Trees
    const treePoz = [[-3.5, -3], [3.5, -3], [-4, 2], [4, 2], [-2, 4.5], [2, -4.5]];
    treePoz.forEach(([x, z]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.5, 7),
        new THREE.MeshLambertMaterial({ color: 0x6D4C41 }));
      trunk.position.set(x, 0.75, z); trunk.castShadow = true; this.scene.add(trunk);
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 7),
        new THREE.MeshLambertMaterial({ color: pick([0x2E7D32, 0x388E3C, 0x43A047]) }));
      foliage.position.set(x, 2.3, z); foliage.castShadow = true; this.scene.add(foliage);
    });

    // Fountain
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.4, 16),
      new THREE.MeshLambertMaterial({ color: 0x90A4AE }));
    fBase.position.set(3, 0.2, -1); this.scene.add(fBase);
    const fWater = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x29B6F6, transparent: true, opacity: 0.7 }));
    fWater.position.set(3, 0.4, -1); this.scene.add(fWater);
  }

  /* ═══════════════════════════════════════════════════════════
     LIBRARY ROOM
     ═══════════════════════════════════════════════════════════ */
  _buildLibraryRoom(characterState) {
    this.scene.background = new THREE.Color(0xFFF8F0);
    this._buildRoomShell(0xD7B98E, 0xFFF3E0, 0xFAF8F0);

    // Tall bookshelves
    const shelfMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
    [[-4, -3], [-4, 0], [-4, 3]].forEach(([x, z]) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.5, 1.8), shelfMat);
      shelf.position.set(x, 1.75, z); this.scene.add(shelf);

      // Fill with books
      const bookColors = [0xC62828, 0x2E7D32, 0x1565C0, 0xE65100, 0x6A1B9A, 0x37474F, 0x00838F];
      for (let b = 0; b < 18; b++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, randFloat(0.28, 0.45), randFloat(0.14, 0.18)),
          new THREE.MeshLambertMaterial({ color: pick(bookColors) })
        );
        book.position.set(x + 0.14, 0.3 + Math.floor(b / 6) * 0.9 + randFloat(0, 0.1), z - 0.7 + (b % 6) * 0.28);
        this.scene.add(book);
      }
    });

    // Study table (interactable)
    const studyTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x5D4037 }));
    studyTable.position.set(1.5, 0.72, -1); this.scene.add(studyTable);
    studyTable.userData.clickable = true;
    this._addInteractable(studyTable, 'library', 'Study Table');

    // Chair
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x795548 }));
    chairSeat.position.set(1.5, 0.48, 0.2); this.scene.add(chairSeat);

    // Book on table
    const openBook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xFFF9C4 }));
    openBook.position.set(1.5, 0.79, -1.1); this.scene.add(openBook);

    // Lamp on table
    const tLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.04, 12),
      new THREE.MeshLambertMaterial({ color: 0xFFD54F, transparent: true, opacity: 0.9 }));
    tLamp.position.set(2.3, 0.84, -1.2); this.scene.add(tLamp);

    // Warm reading light
    const readLight = new THREE.PointLight(0xFFE082, 0.8, 5);
    readLight.position.set(1.5, 2.5, -1); this.scene.add(readLight);

    // Window
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xFFF9C4, transparent: true, opacity: 0.5 }));
    win.position.set(3.5, 2.5, -4.9); this.scene.add(win);
  }

  /* ─── Simple NPC for rooms ─── */
  _buildSimpleNPC(skinColor, outfitColor) {
    const g = new THREE.Group();
    g.add(Object.assign(
      new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.18),
        new THREE.MeshLambertMaterial({ color: outfitColor })),
      { position: new THREE.Vector3(0, 0.97, 0) }
    ));
    g.add(Object.assign(
      new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8),
        new THREE.MeshLambertMaterial({ color: skinColor })),
      { position: new THREE.Vector3(0, 1.45, 0) }
    ));
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  /* ═══════════════════════════════════════════════════════════
     UPDATE & RENDER
     ═══════════════════════════════════════════════════════════ */
  update(dt, stats) {
    this.animTime += dt;

    // Pulse the interaction indicators
    this.highlightMeshes.forEach((ring, i) => {
      const pulse = 0.6 + Math.sin(this.animTime * 2 + i) * 0.3;
      ring.material.opacity = pulse;
      const scale = 1 + Math.sin(this.animTime * 1.5 + i) * 0.08;
      ring.scale.set(scale, scale, scale);
    });

    // Animate NPCs
    this.npcMeshes.forEach((entry, i) => {
      const t = this.animTime + i * 1.5;
      entry.mesh.rotation.y = Math.sin(t * 0.4) * 0.15;
    });

    // Update character
    this.characterModel.update(dt, stats);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /* ─── Raycasting for clicks ─── */
  onTap(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width)  *  2 - 1;
    this.mouse.y = ((clientY - rect.top)  / rect.height) * -2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const clickables = this.interactables.map(i => i.mesh);
    const hits = this.raycaster.intersectObjects(clickables, true);
    if (hits.length > 0) {
      const mesh = hits[0].object;
      const entry = this.interactables.find(i =>
        i.mesh === mesh || i.mesh.children.includes(mesh)
      );
      return entry ? entry.triggerId : null;
    }
    return null;
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const d = 8;
    this.camera.left   = -d * aspect;
    this.camera.right  =  d * aspect;
    this.camera.top    =  d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
  }
}
