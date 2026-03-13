/* ═══════════════════════════════════════════════════════════
   OTTO — Isometric Map Scene (Three.js)
   Buildings, terrain, NPCs, weather, character movement
   ═══════════════════════════════════════════════════════════ */
'use strict';

class MapScene {
  constructor(renderer, characterModel, npcSystem) {
    this.renderer       = renderer;
    this.characterModel = characterModel;
    this.npcSystem      = npcSystem;

    this.scene          = new THREE.Scene();
    this.camera         = null;
    this.raycaster      = new THREE.Raycaster();
    this.mouse          = new THREE.Vector2();

    this.locationMeshes = {}; // locationId → clickable mesh
    this.npcMeshes      = []; // array of {mesh, npcId}
    this.weatherParticles = null;
    this.weatherType    = 'sunny';
    this.clouds         = [];
    this.animTime       = 0;

    this._clickListeners = [];

    this._buildScene();
  }

  /* ═══════════════════════════════════════════════════════════
     SCENE CONSTRUCTION
     ═══════════════════════════════════════════════════════════ */
  _buildScene() {
    // Background gradient sky
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0xADD8E6, 30, 55);

    // Isometric camera — orthographic for clean iso look
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const d = 16;
    this.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect, d, -d, 0.1, 200
    );
    this.camera.position.set(18, 18, 18);
    this.camera.lookAt(0, 0, 0);

    // Ambient light
    const ambient = new THREE.AmbientLight(0xFFFFEE, 0.7);
    this.scene.add(ambient);

    // Directional sun light
    this.sun = new THREE.DirectionalLight(0xFFF5CC, 1.1);
    this.sun.position.set(15, 25, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width  = 1024;
    this.sun.shadow.mapSize.height = 1024;
    this.sun.shadow.camera.near   = 0.5;
    this.sun.shadow.camera.far    = 80;
    this.sun.shadow.camera.left   = -20;
    this.sun.shadow.camera.right  =  20;
    this.sun.shadow.camera.top    =  20;
    this.sun.shadow.camera.bottom = -20;
    this.scene.add(this.sun);

    // Fill light (soft blue from opposite)
    const fill = new THREE.DirectionalLight(0xCCDDFF, 0.35);
    fill.position.set(-10, 8, -10);
    this.scene.add(fill);

    // Ground
    this._buildGround();

    // Roads
    this._buildRoads();

    // Buildings / Locations
    this._buildLocations();

    // Trees & vegetation
    this._buildTrees();

    // NPC characters on map
    this._buildNPCModels();

    // Clouds
    this._buildClouds();

    // Add player character to scene
    this.characterModel.group.position.set(
      CONFIG.LOCATION_POSITIONS.home.x,
      0,
      CONFIG.LOCATION_POSITIONS.home.z
    );
    this.scene.add(this.characterModel.group);
  }

  _buildGround() {
    // Main grass ground
    const groundGeo = new THREE.PlaneGeometry(50, 50, 20, 20);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Variation patches
    const colors = [0x43A047, 0x66BB6A, 0x388E3C];
    for (let i = 0; i < 18; i++) {
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(randFloat(1.5, 4), randFloat(1.5, 4)),
        new THREE.MeshLambertMaterial({ color: pick(colors) })
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(randFloat(-22, 22), 0.01, randFloat(-22, 22));
      this.scene.add(patch);
    }
  }

  _buildRoads() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x616161 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFF9C4 });

    // Horizontal road
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(50, 2.5), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.02, 0);
    this.scene.add(hRoad);

    // Vertical road
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 50), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(0, 0.02, 0);
    this.scene.add(vRoad);

    // Center lane markings
    for (let i = -5; i <= 5; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.2), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(i * 2.5, 0.03, 0);
      this.scene.add(dash);
    }
    for (let i = -5; i <= 5; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.1), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.03, i * 2.5);
      this.scene.add(dash);
    }

    // Sidewalk borders
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xBDBDBD });
    [[0, 1.65, 50, 0.8], [0, -1.65, 50, 0.8]].forEach(([x, z, w, d]) => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sidewalkMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(x, 0.015, z);
      this.scene.add(sw);
    });
  }

  _buildLocations() {
    Object.entries(LOCATION_DATA).forEach(([id, loc]) => {
      const pos = CONFIG.LOCATION_POSITIONS[id];
      if (!pos) return;

      let group;
      switch (id) {
        case 'home':    group = this._buildHouse(loc.color); break;
        case 'office':  group = this._buildOfficeBuilding(loc.color); break;
        case 'gym':     group = this._buildGym(loc.color); break;
        case 'cafe':    group = this._buildCafe(loc.color); break;
        case 'park':    group = this._buildParkArea(loc.color); break;
        case 'library': group = this._buildLibrary(loc.color); break;
        default:        group = this._buildGenericBuilding(loc.color); break;
      }

      group.position.set(pos.x, 0, pos.z);
      group.userData.locationId = id;
      this.scene.add(group);

      // Clickable marker (invisible plane over building)
      const marker = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 3.5),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(pos.x, 0.5, pos.z);
      marker.userData.locationId = id;
      this.scene.add(marker);
      this.locationMeshes[id] = marker;

      // Location label floating above
      this._addLocationLabel(loc.label, loc.icon, pos);
    });
  }

  _buildHouse(color) {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xFFF3E0 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
    const baseMat = new THREE.MeshLambertMaterial({ color: 0xD7CCC8 });
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const winMat  = new THREE.MeshLambertMaterial({ color: 0xB3E5FC });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xFFCC80 });

    // Foundation
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), baseMat);
    base.position.y = 0.12; g.add(base);

    // Walls
    const walls = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.9, 3.0), wallMat);
    walls.position.y = 1.2; g.add(walls);

    // Roof (ConeGeometry with 4 sides = pyramid)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 4), roofMat);
    roof.position.y = 2.85; roof.rotation.y = Math.PI / 4; g.add(roof);

    // Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    chimney.position.set(-0.8, 3.0, -0.6); g.add(chimney);

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.08), doorMat);
    door.position.set(0, 0.7, 1.52); g.add(door);

    // Door frame trim
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.06), trimMat);
    frame.position.set(0, 0.7, 1.54); g.add(frame);

    // Windows
    [[-0.9, 0.8], [0.9, 0.8]].forEach(([wx, wy]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), winMat);
      win.position.set(wx, wy, 1.52); g.add(win);
      const wframe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.06), trimMat);
      wframe.position.set(wx, wy, 1.54); g.add(wframe);
    });

    // Garden path
    const path = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8),
      new THREE.MeshLambertMaterial({ color: 0xBCAAA4 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, 2.5); g.add(path);

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _buildOfficeBuilding(color) {
    const g = new THREE.Group();

    // Main tower
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 6, 3.0),
      new THREE.MeshLambertMaterial({ color: 0x546E7A })
    );
    body.position.y = 3; g.add(body);

    // Glass facade overlay
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 5.8, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xB3E5FC, transparent: true, opacity: 0.6 })
    );
    glass.position.set(0, 3, 1.56); g.add(glass);

    // Window grid
    const winMat = new THREE.MeshLambertMaterial({ color: 0x81D4FA });
    for (let row = 0; row < 5; row++) {
      for (let col = -1; col <= 1; col++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), winMat);
        win.position.set(col * 1.1, 0.8 + row * 1.1, 1.58);
        g.add(win);
      }
    }

    // Entrance canopy
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.15, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x90A4AE })
    );
    canopy.position.set(0, 0.8, 2.2); g.add(canopy);

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x37474F }));
    door.position.set(0, 0.55, 1.58); g.add(door);

    // Rooftop AC units
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x78909C }));
    ac.position.set(1, 6.15, 0.5); g.add(ac);

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _buildGym(color) {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xECEFF1 });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0xF44336 });

    // Main warehouse body
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.8, 3.5), wallMat);
    body.position.y = 1.4; g.add(body);

    // Red accent stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, 0.15), accentMat);
    stripe.position.set(0, 2.5, 1.78); g.add(stripe);

    // Large front windows
    const winMat = new THREE.MeshLambertMaterial({ color: 0x80DEEA, transparent: true, opacity: 0.7 });
    const frontWin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 0.1), winMat);
    frontWin.position.set(0, 1.2, 1.78); g.add(frontWin);

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x37474F }));
    door.position.set(0, 0.7, 1.82); g.add(door);

    // Flat roof with raised edge
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.2, 3.7),
      new THREE.MeshLambertMaterial({ color: 0xB0BEC5 }));
    roof.position.y = 2.9; g.add(roof);

    // Sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.15), accentMat);
    sign.position.set(0, 2.2, 1.82); g.add(sign);

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _buildCafe(color) {
    const g = new THREE.Group();

    // Cozy cottage body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 2.6),
      new THREE.MeshLambertMaterial({ color: 0xFFECB3 }));
    body.position.y = 0.9; g.add(body);

    // Pitched roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.0, 4),
      new THREE.MeshLambertMaterial({ color: 0x795548 }));
    roof.position.y = 2.3; roof.rotation.y = Math.PI / 4; g.add(roof);

    // Awning / Canopy
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.2),
      new THREE.MeshLambertMaterial({ color: 0xFF8F00 }));
    awning.position.set(0, 1.3, 1.8); g.add(awning);

    // Awning stripes (dark)
    for (let i = -0.9; i <= 0.9; i += 0.45) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 1.25),
        new THREE.MeshLambertMaterial({ color: 0xE65100 }));
      stripe.position.set(i, 1.3, 1.8); g.add(stripe);
    }

    // Windows (arched via tall box)
    const winMat = new THREE.MeshLambertMaterial({ color: 0xFFF9C4 });
    [[-0.75], [0.75]].forEach(([wx]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.09), winMat);
      win.position.set(wx, 0.85, 1.35); g.add(win);
    });

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x5D4037 }));
    door.position.set(0, 0.48, 1.37); g.add(door);

    // Outdoor table
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.08, 12),
      new THREE.MeshLambertMaterial({ color: 0xFFECB3 }));
    table.position.set(1.8, 0.55, 0.5); g.add(table);
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    tableLeg.position.set(1.8, 0.3, 0.5); g.add(tableLeg);

    // Chair
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    chair.position.set(2.3, 0.38, 0.5); g.add(chair);

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _buildParkArea(color) {
    const g = new THREE.Group();

    // Green grass patch
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(6, 6),
      new THREE.MeshLambertMaterial({ color: 0x66BB6A }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.03; g.add(grass);

    // Bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x8D6E63 }));
    bench.position.set(0.8, 0.45, -0.8); g.add(bench);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x5D4037 }));
    bl.position.set(-0.55, 0.22, -0.8); g.add(bl);
    const br = bl.clone(); br.position.set(0.55, 0.22, -0.8); g.add(br);

    // Fountain base
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.35, 16),
      new THREE.MeshLambertMaterial({ color: 0x90A4AE }));
    fountain.position.set(-1.0, 0.2, 0.5); g.add(fountain);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x29B6F6, transparent: true, opacity: 0.75 }));
    water.position.set(-1.0, 0.35, 0.5); g.add(water);

    // Lamppost
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6),
      new THREE.MeshLambertMaterial({ color: 0x455A64 }));
    post.position.set(1.5, 1.4, 1.5); g.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xFFF59D }));
    lamp.position.set(1.5, 2.9, 1.5); g.add(lamp);

    // Large park tree (built here, not in _buildTrees)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: 0x6D4C41 }));
    trunk.position.set(-2, 0.6, -2); g.add(trunk);
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0x2E7D32 }));
    foliage.position.set(-2, 2.3, -2); g.add(foliage);

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _buildLibrary(color) {
    const g = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xECEFF1 });
    const roofMat  = new THREE.MeshLambertMaterial({ color: 0x607D8B });

    // Classical body
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.6, 3.0), stoneMat);
    body.position.y = 1.3; g.add(body);

    // Flat roof with parapet
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 3.2), roofMat);
    roof.position.y = 2.7; g.add(roof);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.25, 0.2), roofMat);
    parapet.position.set(0, 2.85, 1.7); g.add(parapet);

    // Columns (front)
    [-1.2, 0, 1.2].forEach(x => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.4, 8),
        new THREE.MeshLambertMaterial({ color: 0xF5F5F5 }));
      col.position.set(x, 1.2, 1.62); g.add(col);
    });

    // Steps
    const steps = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 0.8),
      new THREE.MeshLambertMaterial({ color: 0xBDBDBD }));
    steps.position.set(0, 0.12, 2.2); g.add(steps);

    // Door (double)
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });
    [-0.3, 0.3].forEach(x => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.1), doorMat);
      door.position.set(x, 0.75, 1.62); g.add(door);
    });

    // Windows (arched)
    const winMat = new THREE.MeshLambertMaterial({ color: 0xB3E5FC });
    [[-1.2], [1.2]].forEach(([x]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.09), winMat);
      win.position.set(x, 1.6, 1.62); g.add(win);
    });

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _buildGenericBuilding(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.5; g.add(body);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  _addLocationLabel(label, icon, pos) {
    // We'll use CSS2D-style HTML labels by positioning DOM elements
    // For simplicity, store label info for UI to render
    // (handled in UI.js updateLocationLabels)
  }

  _buildTrees() {
    const trunkMat   = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });
    const foliageMats = [
      new THREE.MeshLambertMaterial({ color: 0x2E7D32 }),
      new THREE.MeshLambertMaterial({ color: 0x388E3C }),
      new THREE.MeshLambertMaterial({ color: 0x1B5E20 }),
      new THREE.MeshLambertMaterial({ color: 0x43A047 }),
    ];

    const treePositions = [
      [-14, -12], [14, -12], [-14, 12], [14, 12],
      [-18, 0], [18, 0], [0, -18], [0, 18],
      [-10, -15], [10, -15], [-10, 15], [10, 15],
      [3, -12], [-3, -12], [12, 3], [-12, 3],
      [6, 12], [-6, 12], [15, 7], [-15, 7],
    ];

    treePositions.forEach(([x, z]) => {
      const h = randFloat(1.6, 2.6);
      const r = randFloat(0.7, 1.2);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, h * 0.6, 7),
        trunkMat
      );
      trunk.position.set(x, h * 0.3, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(r, 10, 7),
        pick(foliageMats)
      );
      foliage.position.set(x, h * 0.6 + r * 0.7, z);
      foliage.castShadow = true;
      this.scene.add(foliage);
    });
  }

  _buildNPCModels() {
    const locations = ['office', 'cafe', 'gym', 'park'];
    locations.forEach(locId => {
      const pos = CONFIG.LOCATION_POSITIONS[locId];
      if (!pos) return;
      const npcs = this.npcSystem.getNPCsByLocation(locId);
      npcs.forEach((npc, i) => {
        const model = this._buildSimpleNPC(npc.skinColor, npc.outfitColor);
        model.position.set(pos.x + (i - 0.5) * 1.2, 0, pos.z + 1.5);
        model.userData.npcId = npc.id;
        this.scene.add(model);
        this.npcMeshes.push({ mesh: model, npcId: npc.id, baseX: pos.x + (i - 0.5) * 1.2, baseZ: pos.z + 1.5 });
      });
    });
  }

  _buildSimpleNPC(skinColor, outfitColor) {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: skinColor });
    const cloth = new THREE.MeshLambertMaterial({ color: outfitColor });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.18), cloth);
    body.position.y = 0.97; g.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), skin);
    head.position.y = 1.45; g.add(head);

    // Arms
    [-0.22, 0.22].forEach(x => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.38, 6), skin);
      arm.position.set(x, 0.92, 0); g.add(arm);
    });

    // Legs
    [-0.09, 0.09].forEach(x => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.5, 6), cloth);
      leg.position.set(x, 0.47, 0); g.add(leg);
    });

    g.scale.set(0.85, 0.85, 0.85);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  _buildClouds() {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xFFFFFF, transparent: true, opacity: 0.85
    });
    for (let i = 0; i < 8; i++) {
      const cloudGroup = new THREE.Group();
      [0, 1, 2].forEach(j => {
        const blob = new THREE.Mesh(
          new THREE.SphereGeometry(randFloat(1.2, 2.2), 8, 6),
          cloudMat
        );
        blob.position.set(j * randFloat(1.4, 2.0), randFloat(-0.5, 0.5), 0);
        cloudGroup.add(blob);
      });
      cloudGroup.position.set(randFloat(-22, 22), randFloat(18, 24), randFloat(-22, 22));
      this.scene.add(cloudGroup);
      this.clouds.push(cloudGroup);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     WEATHER
     ═══════════════════════════════════════════════════════════ */
  setWeather(type) {
    this.weatherType = type;

    // Sky color
    const skies = {
      sunny:    0x87CEEB,
      cloudy:   0xB0BEC5,
      rainy:    0x78909C,
      overcast: 0x90A4AE,
    };
    this.scene.background = new THREE.Color(skies[type] || 0x87CEEB);

    // Sun intensity
    const sunIntensity = { sunny: 1.1, cloudy: 0.7, rainy: 0.4, overcast: 0.5 };
    this.sun.intensity = sunIntensity[type] || 1.0;

    // Rain particles
    if (type === 'rainy') {
      this._createRain();
    } else if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles = null;
    }
  }

  _createRain() {
    if (this.weatherParticles) this.scene.remove(this.weatherParticles);
    const count = 600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = randFloat(-25, 25);
      pos[i * 3 + 1] = randFloat(0, 22);
      pos[i * 3 + 2] = randFloat(-25, 25);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x90CAF9, size: 0.08, transparent: true, opacity: 0.5 });
    this.weatherParticles = new THREE.Points(geo, mat);
    this.scene.add(this.weatherParticles);
  }

  /* ═══════════════════════════════════════════════════════════
     UPDATE LOOP
     ═══════════════════════════════════════════════════════════ */
  update(dt, stats) {
    this.animTime += dt;

    // Animate clouds
    this.clouds.forEach((cloud, i) => {
      cloud.position.x += dt * 0.3 * (i % 2 === 0 ? 1 : -0.6);
      if (cloud.position.x > 25) cloud.position.x = -25;
      if (cloud.position.x < -25) cloud.position.x = 25;
    });

    // Animate NPCs (subtle idle sway)
    this.npcMeshes.forEach((entry, i) => {
      const t = this.animTime + i * 1.2;
      entry.mesh.position.y = Math.abs(Math.sin(t * 0.8)) * 0.02;
      entry.mesh.rotation.y = Math.sin(t * 0.3) * 0.08;
    });

    // Animate rain
    if (this.weatherParticles) {
      const positions = this.weatherParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= dt * 12;
        if (positions[i + 1] < 0) positions[i + 1] = 22;
      }
      this.weatherParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Update character
    this.characterModel.update(dt, stats);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /* ═══════════════════════════════════════════════════════════
     CLICK / RAYCASTING
     ═══════════════════════════════════════════════════════════ */
  onTap(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width)  *  2 - 1;
    this.mouse.y = ((clientY - rect.top)  / rect.height) * -2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const markers = Object.values(this.locationMeshes);
    const hits = this.raycaster.intersectObjects(markers, false);
    if (hits.length > 0) {
      return hits[0].object.userData.locationId;
    }
    return null;
  }

  /* ─── Resize ─── */
  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const d = 16;
    this.camera.left   = -d * aspect;
    this.camera.right  =  d * aspect;
    this.camera.top    =  d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
  }
}
