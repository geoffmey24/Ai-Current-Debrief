/* ═══════════════════════════════════════════════════════════
   OTTO — NPC System
   Manages persistent NPC relationships and state
   ═══════════════════════════════════════════════════════════ */
'use strict';

class NPCSystem {
  constructor() {
    // Deep clone NPC data so we can modify it
    this.npcs = NPC_DATA.map(n => ({ ...n }));

    // Track romantic partner (only one at a time)
    this.partnerId   = null;
    this.partnerName = null;

    // Track friends
    this.friendIds = new Set();

    // Listeners
    this._listeners = [];
  }

  onChange(fn) { this._listeners.push(fn); }
  _notify(ev)  { this._listeners.forEach(f => f(ev)); }

  getNPC(id) {
    return this.npcs.find(n => n.id === id) || null;
  }

  getNPCsByLocation(locationId) {
    return this.npcs.filter(n => n.location === locationId);
  }

  // Adjust relationship score for an NPC
  adjustRelationship(npcId, delta) {
    const npc = this.getNPC(npcId);
    if (!npc) return;
    npc.relationship = clamp((npc.relationship || 0) + delta, -50, 100);
    this._checkRelationshipMilestone(npc);
    this._notify({ type: 'relationship', npc });
  }

  _checkRelationshipMilestone(npc) {
    const rel = npc.relationship;
    if (rel >= CONFIG.REL_LEVELS.close_friend && !this.friendIds.has(npc.id)) {
      this.friendIds.add(npc.id);
      this._notify({ type: 'new_friend', npc });
    }
  }

  // Try to start a romantic relationship
  startRomance(npcId) {
    if (this.partnerId) return false; // already in relationship
    const npc = this.getNPC(npcId);
    if (!npc) return false;
    this.partnerId = npcId;
    this.partnerName = npc.name;
    npc.relationship = Math.max(npc.relationship, 40);
    this._notify({ type: 'romance_start', npc });
    return true;
  }

  // End a romantic relationship
  endRomance() {
    if (!this.partnerId) return;
    const npc = this.getNPC(this.partnerId);
    if (npc) {
      npc.relationship = Math.max(0, npc.relationship - 30);
    }
    const oldPartner = this.partnerName;
    this.partnerId = null;
    this.partnerName = null;
    this._notify({ type: 'romance_end', name: oldPartner });
  }

  hasPartner() {
    return !!this.partnerId;
  }

  getPartner() {
    return this.partnerId ? this.getNPC(this.partnerId) : null;
  }

  // Get an NPC by type for relationship cards
  getNPCByType(type) {
    return this.npcs.find(n => n.type === type) || null;
  }

  // Best candidate for romantic interest at this location
  getRomanticInterestAt(locationId) {
    return this.npcs.find(n =>
      n.type === 'romantic_interest' &&
      n.location === locationId &&
      n.relationship > 10 &&
      !this.hasPartner()
    ) || null;
  }

  // Adjust relationship for all npcs of a type
  adjustTypeRelationship(npcType, delta) {
    this.npcs
      .filter(n => n.type === npcType)
      .forEach(n => this.adjustRelationship(n.id, delta));
  }

  // Get all friends
  getFriends() {
    return this.npcs.filter(n => this.friendIds.has(n.id));
  }

  // Check if there's NPC interest (relationship > 20, right type)
  hasRomanticInterest(locationId) {
    return this.npcs.some(n =>
      n.type === 'romantic_interest' &&
      n.location === locationId &&
      n.relationship >= 20 &&
      !this.hasPartner()
    );
  }

  // Partner relationship check — low relationship can trigger breakup
  partnerRelationshipLevel() {
    if (!this.partnerId) return 100;
    const p = this.getPartner();
    return p ? p.relationship : 0;
  }

  // Get total number of relationships formed
  totalRelationships() {
    return this.npcs.filter(n => (n.relationship || 0) >= 15).length;
  }

  serialize() {
    return {
      npcs: this.npcs.map(n => ({ ...n })),
      partnerId: this.partnerId,
      partnerName: this.partnerName,
      friendIds: [...this.friendIds],
    };
  }

  restore(data) {
    this.npcs = data.npcs || this.npcs;
    this.partnerId = data.partnerId || null;
    this.partnerName = data.partnerName || null;
    this.friendIds = new Set(data.friendIds || []);
  }
}
