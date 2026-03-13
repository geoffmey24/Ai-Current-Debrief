/* ═══════════════════════════════════════════════════════════
   OTTO — 3D Character Model (Three.js)
   Procedurally built humanoid with full animation system
   ═══════════════════════════════════════════════════════════ */
'use strict';

class CharacterModel {
  constructor(characterState, stats) {
    this.characterState = characterState;
    this.stats          = stats;
    this.group          = new THREE.Group();
    this.parts          = {};
    this.animTime       = 0;
    this.anim           = 'idle';
    this.targetPos      = null;
    this.onArrived      = null;
    this._walkSpeed     = 3.5;

    this._build();
  }

  /* ─── Build full character geometry ─── */
  _build() {
    const cs = this.characterState;
    const skin = cs.skinColor;
    const hair = cs.hairColor;
    const outfit = cs.outfitColor;

    // Shadow disc
    const shadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.25, transparent: true })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);

    // ── Feet / Shoes ──
    ['left', 'right'].forEach((side, i) => {
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.1, 0.22),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      foot.position.set(i === 0 ? -0.1 : 0.1, 0.08, 0.03);
      foot.castShadow = true;
      this.parts[side + 'Foot'] = foot;
      this.group.add(foot);
    });

    // ── Legs ──
    ['left', 'right'].forEach((side, i) => {
      const legGroup = new THREE.Group();

      // Upper leg (thigh)
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.08, 0.28, 8),
        new THREE.MeshLambertMaterial({ color: this._darken(outfit, 0.6) })
      );
      thigh.position.y = -0.14;
      legGroup.add(thigh);

      // Lower leg (shin)
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.065, 0.28, 8),
        new THREE.MeshLambertMaterial({ color: this._darken(outfit, 0.6) })
      );
      shin.position.y = -0.42;
      legGroup.add(shin);

      legGroup.position.set(i === 0 ? -0.1 : 0.1, 0.58, 0);
      legGroup.castShadow = true;
      this.parts[side + 'Leg'] = legGroup;
      this.group.add(legGroup);
    });

    // ── Torso / Shirt ──
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.5, 0.24),
      new THREE.MeshLambertMaterial({ color: outfit })
    );
    torso.position.y = 1.04;
    torso.castShadow = true;
    this.parts.torso = torso;
    this.group.add(torso);

    // Shirt collar detail
    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.26),
      new THREE.MeshLambertMaterial({ color: this._lighten(outfit, 0.3) })
    );
    collar.position.set(0, 1.28, 0);
    this.group.add(collar);

    // ── Arms ──
    ['left', 'right'].forEach((side, i) => {
      const armGroup = new THREE.Group();

      // Upper arm (sleeve)
      const upper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.07, 0.24, 8),
        new THREE.MeshLambertMaterial({ color: outfit })
      );
      upper.position.y = -0.12;
      armGroup.add(upper);

      // Lower arm (forearm skin)
      const lower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.055, 0.24, 8),
        new THREE.MeshLambertMaterial({ color: skin })
      );
      lower.position.y = -0.38;
      armGroup.add(lower);

      // Hand
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshLambertMaterial({ color: skin })
      );
      hand.position.y = -0.55;
      armGroup.add(hand);

      armGroup.position.set(i === 0 ? -0.26 : 0.26, 1.14, 0);
      armGroup.castShadow = true;
      this.parts[side + 'Arm'] = armGroup;
      this.group.add(armGroup);
    });

    // ── Neck ──
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8),
      new THREE.MeshLambertMaterial({ color: skin })
    );
    neck.position.y = 1.37;
    this.group.add(neck);

    // ── Head ──
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.56;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 18, 14),
      new THREE.MeshLambertMaterial({ color: skin })
    );
    headGroup.add(head);
    this.parts.head = headGroup;

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const eyeGeo = new THREE.SphereGeometry(0.038, 8, 6);
    [-0.09, 0.09].forEach((x, i) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.03, 0.2);
      headGroup.add(eye);
      this.parts[i === 0 ? 'leftEye' : 'rightEye'] = eye;
    });

    // Eye whites
    const whiteGeo = new THREE.SphereGeometry(0.055, 8, 6);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    [-0.09, 0.09].forEach(x => {
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.position.set(x, 0.03, 0.185);
      headGroup.add(white);
    });

    // Nose (small bump)
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 4),
      new THREE.MeshLambertMaterial({ color: this._darken(skin, 0.85) })
    );
    nose.position.set(0, -0.03, 0.225);
    headGroup.add(nose);

    // Mouth
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.025, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x993333 })
    );
    mouth.position.set(0, -0.1, 0.22);
    headGroup.add(mouth);
    this.parts.mouth = mouth;

    this.group.add(headGroup);

    // ── Hair ──
    this._buildHair(hair, cs.hairStyleKey);

    // Eyebrow detail
    const browMat = new THREE.MeshBasicMaterial({ color: hair });
    const browGeo = new THREE.BoxGeometry(0.07, 0.02, 0.03);
    [-0.09, 0.09].forEach(x => {
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(x, 0.1, 0.225);
      headGroup.add(brow);
    });

    // Enable shadows
    this.group.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
  }

  _buildHair(hairColor, style) {
    const mat = new THREE.MeshLambertMaterial({ color: hairColor });
    const headGroup = this.parts.head;

    if (style === 'A') {
      // Short — simple cap
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
        mat
      );
      cap.position.y = 0.05;
      headGroup.add(cap);
      this.parts.hair = cap;
    } else if (style === 'B') {
      // Medium — rounded top with sides
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
        mat
      );
      top.position.y = 0.05;
      headGroup.add(top);

      const sides = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.2, 0.5),
        mat
      );
      sides.position.y = -0.1;
      headGroup.add(sides);
      this.parts.hair = top;
    } else if (style === 'C') {
      // Long — cap + flowing hair down
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.265, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
        mat
      );
      cap.position.y = 0.05;
      headGroup.add(cap);

      const flow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.265, 0.2, 0.5, 12, 1, true),
        mat
      );
      flow.position.y = -0.27;
      headGroup.add(flow);
      this.parts.hair = cap;
    }
  }

  /* ─── Update hair color for aging ─── */
  updateAging(age) {
    const cs  = this.characterState;
    const agedHairColor = cs.getAgedHairColor(age);

    if (this.parts.hair) {
      this.parts.hair.material.color.setHex(agedHairColor);
      // Update eyebrows too
      this.parts.head.children.forEach(child => {
        if (child.geometry && child.geometry.parameters &&
            child.geometry.parameters.width === 0.07) {
          child.material.color.setHex(agedHairColor);
        }
      });
    }

    // Posture lean for aging
    if (age > CONFIG.AGE_WRINKLE) {
      const leanFactor = Math.min(0.12, (age - CONFIG.AGE_WRINKLE) / 150);
      this.group.rotation.x = leanFactor;
    }
  }

  /* ─── Outfit swap by location type ─── */
  setOutfitForLocation(outfitType) {
    const color = this.characterState.getOutfitColor(outfitType);
    const darkColor = this._darken(color, 0.6);

    // Update torso and arms
    if (this.parts.torso) this.parts.torso.material.color.setHex(color);
    ['left', 'right'].forEach(side => {
      const arm = this.parts[side + 'Arm'];
      if (arm) arm.children[0].material.color.setHex(color); // sleeve
      const leg = this.parts[side + 'Leg'];
      if (leg) {
        leg.children[0].material.color.setHex(darkColor);
        leg.children[1].material.color.setHex(darkColor);
      }
    });
  }

  /* ─── Animation ─── */
  setAnimation(name) {
    if (this.anim !== name) {
      this.anim = name;
      this.animTime = 0;
      this._resetPose();
    }
  }

  _resetPose() {
    ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'].forEach(k => {
      if (this.parts[k]) {
        this.parts[k].rotation.x = 0;
        this.parts[k].rotation.z = 0;
      }
    });
    if (this.group) {
      this.group.position.y = 0;
      this.group.rotation.x = 0;
    }
  }

  update(dt, stats) {
    this.animTime += dt;
    const t = this.animTime;

    switch (this.anim) {
      case 'idle':    this._animIdle(t, stats); break;
      case 'walk':    this._animWalk(t, stats); break;
      case 'work':    this._animWork(t); break;
      case 'exercise':this._animExercise(t); break;
      case 'socialize':this._animSocialize(t); break;
      case 'celebrate':this._animCelebrate(t); break;
    }

    // Walk-to logic
    if (this.targetPos) {
      this._moveTowards(dt, stats);
    }
  }

  _animIdle(t, stats) {
    // Subtle breathing
    if (this.parts.torso) {
      this.parts.torso.scale.y = 1 + Math.sin(t * 1.4) * 0.018;
    }
    // Head micro-movement
    if (this.parts.head) {
      this.parts.head.rotation.y = Math.sin(t * 0.4) * 0.04;
      this.parts.head.rotation.x = Math.sin(t * 0.3) * 0.02;
    }
    // Arm sway
    if (this.parts.leftArm) this.parts.leftArm.rotation.z = -0.08 + Math.sin(t * 0.6) * 0.02;
    if (this.parts.rightArm) this.parts.rightArm.rotation.z = 0.08 + Math.sin(t * 0.6 + 1) * 0.02;

    // Tired animations
    if (stats && this.characterState.isTired(stats.happiness, stats.health)) {
      if (this.parts.head) this.parts.head.rotation.x = 0.12 + Math.sin(t * 0.5) * 0.04;
      if (this.parts.leftArm) this.parts.leftArm.rotation.z = -0.18;
      if (this.parts.rightArm) this.parts.rightArm.rotation.z = 0.18;
    }
  }

  _animWalk(t) {
    const f = t * 5.5;
    const swing = 0.38;
    if (this.parts.leftArm)  this.parts.leftArm.rotation.x  =  Math.sin(f) * swing;
    if (this.parts.rightArm) this.parts.rightArm.rotation.x = -Math.sin(f) * swing;
    if (this.parts.leftLeg)  this.parts.leftLeg.rotation.x  = -Math.sin(f) * swing;
    if (this.parts.rightLeg) this.parts.rightLeg.rotation.x  = Math.sin(f) * swing;
    // Bob
    this.group.position.y = Math.abs(Math.sin(f * 2)) * 0.06;
    // Lean slightly forward
    this.group.rotation.x = 0.04;
  }

  _animWork(t) {
    // Typing animation
    const f = t * 3;
    if (this.parts.leftArm) {
      this.parts.leftArm.rotation.x  = -0.4 + Math.sin(f) * 0.1;
    }
    if (this.parts.rightArm) {
      this.parts.rightArm.rotation.x = -0.4 + Math.sin(f + 0.5) * 0.1;
    }
    if (this.parts.head) {
      this.parts.head.rotation.x = 0.15 + Math.sin(t * 0.8) * 0.04;
    }
  }

  _animExercise(t) {
    const f = t * 4;
    if (this.parts.leftArm) {
      this.parts.leftArm.rotation.x = Math.sin(f) * 0.6;
      this.parts.leftArm.rotation.z = -0.3 + Math.sin(f) * 0.1;
    }
    if (this.parts.rightArm) {
      this.parts.rightArm.rotation.x = -Math.sin(f) * 0.6;
      this.parts.rightArm.rotation.z = 0.3 + Math.sin(f) * 0.1;
    }
    if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = Math.sin(f * 0.8) * 0.35;
    if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -Math.sin(f * 0.8) * 0.35;
    this.group.position.y = Math.abs(Math.sin(f)) * 0.1;
  }

  _animSocialize(t) {
    if (this.parts.leftArm) {
      this.parts.leftArm.rotation.x = Math.sin(t * 0.8) * 0.2;
      this.parts.leftArm.rotation.z = -0.2 + Math.sin(t * 0.5) * 0.1;
    }
    if (this.parts.head) {
      this.parts.head.rotation.y = Math.sin(t * 0.6) * 0.15;
    }
  }

  _animCelebrate(t) {
    const f = t * 5;
    if (this.parts.leftArm)  this.parts.leftArm.rotation.x  = -1.2 + Math.sin(f) * 0.3;
    if (this.parts.rightArm) this.parts.rightArm.rotation.x = -1.2 + Math.sin(f + 1) * 0.3;
    this.group.position.y = Math.abs(Math.sin(f * 0.5)) * 0.15;
    if (this.parts.head) this.parts.head.rotation.y = Math.sin(f) * 0.2;
  }

  /* ─── Movement ─── */
  walkTo(targetWorldPos, onArrived) {
    this.targetPos = targetWorldPos.clone();
    this.onArrived = onArrived;
    this.setAnimation('walk');

    // Face direction of travel
    const dx = targetWorldPos.x - this.group.position.x;
    const dz = targetWorldPos.z - this.group.position.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  _moveTowards(dt, stats) {
    const speed = this._walkSpeed * this.characterState.walkSpeedFactor(stats.age);
    const dx = this.targetPos.x - this.group.position.x;
    const dz = this.targetPos.z - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.08) {
      this.group.position.x = this.targetPos.x;
      this.group.position.z = this.targetPos.z;
      this.targetPos = null;
      this.setAnimation('idle');
      if (this.onArrived) {
        const cb = this.onArrived;
        this.onArrived = null;
        cb();
      }
    } else {
      const step = Math.min(speed * dt, dist);
      this.group.position.x += (dx / dist) * step;
      this.group.position.z += (dz / dist) * step;
      // Update facing
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  isWalking() {
    return this.targetPos !== null;
  }

  /* ─── Color helpers ─── */
  _darken(hex, factor) {
    const r = Math.round(((hex >> 16) & 0xff) * factor);
    const g = Math.round(((hex >> 8)  & 0xff) * factor);
    const b = Math.round((hex & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  _lighten(hex, factor) {
    const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * (1 + factor)));
    const g = Math.min(255, Math.round(((hex >> 8)  & 0xff) * (1 + factor)));
    const b = Math.min(255, Math.round((hex & 0xff) * (1 + factor)));
    return (r << 16) | (g << 8) | b;
  }
}
