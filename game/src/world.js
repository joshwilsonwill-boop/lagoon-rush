// The game's rules and state, with no drawing and no browser in it: the boat
// (now with GTA-style weight: acceleration, drag and drift instead of instant
// steering), the pool of drifting logs, canoes, drums and buoys, the cowrie
// shells, golden catfish and hearts, the wanted system (heat, stars, marine
// patrols that chase and ram, line of sight broken by bridge pillars and
// mangroves), and the mission system (timed deliveries and crate runs).
// step() advances one fixed step and returns what happened as bit flags, so
// the caller can react (and play a sound) without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.

import { BOAT, DOCK_A, DOCK_B, FIELD, FISH, HEART, LEVEL, LIVES, MANGROVES, MISSION, NO_WAKE, OBSTACLE, PARTICLE_POOL, PATROL, PHYSICS, PILLARS, POOL_SIZE, SHELL, WANTED, WIN_SHELLS } from './config.js';

export const KIND_LOG = 0;
export const KIND_CANOE = 1;
export const KIND_DRUM = 2;
export const KIND_BUOY = 3;
export const KIND_SHELL = 4;
export const KIND_FISH = 5;
export const KIND_HEART = 6;
export const KIND_CRATE = 7;

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_FISH = 4;
export const EVENT_HEART = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;
export const EVENT_MISSION = 64;
export const EVENT_SIREN = 128;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Does the segment (x1,y1)-(x2,y2) cross rectangle r? Slab test, scalars only. */
function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  return true;
}

export function createWorld(random) {
  const boat = { x: 0, y: 0, width: BOAT.width, height: BOAT.height, invulnerable: 0, tilt: 0, vx: 0, vy: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_LOG, x: 0, y: 0, width: 0, height: 0, speed: 0, drift: 0, phase: 0 });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0 });
  }
  const patrols = [];
  for (let index = 0; index < PATROL.max; index += 1) {
    patrols.push({ active: false, x: 0, y: 0, width: 110, height: 40, vx: 0, vy: 0, losTimer: 0, cool: 0 });
  }
  const mission = {
    active: false, offered: false, type: '', phase: 0, timer: 0,
    tx: 0, ty: 0, need: 0, got: 0, reward: 0, cowries: 0,
  };
  const state = {
    boat, items, particles, patrols, mission, score: 0, cowries: 0, lives: LIVES, level: 1,
    elapsed: 0, obstacleTimer: 0, shellTimer: 0, fishTimer: 0, heartTimer: 0,
    won: false, wavePhase: 0, speed: 0, wantedHeat: 0, wanted: 0, losTimer: 0,
    patrolTimer: 0, offerTimer: MISSION.offerAt, offerExpires: 0, speeding: false,
    banner: '', bannerTimer: 0, patrolsOff: false,
  };

  function reset() {
    boat.x = (FIELD.width - boat.width) / 2;
    boat.y = 560;
    boat.invulnerable = 0;
    boat.tilt = 0;
    boat.vx = 0;
    boat.vy = 0;
    for (const item of items) item.active = false;
    for (const particle of particles) particle.active = false;
    for (const patrol of patrols) { patrol.active = false; patrol.vx = 0; patrol.vy = 0; patrol.losTimer = 0; patrol.cool = 0; }
    mission.active = false;
    mission.offered = false;
    mission.type = '';
    mission.phase = 0;
    mission.timer = 0;
    mission.tx = 0;
    mission.ty = 0;
    mission.need = 0;
    mission.got = 0;
    mission.reward = 0;
    mission.cowries = 0;
    state.score = 0;
    state.cowries = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.obstacleTimer = OBSTACLE.interval;
    state.shellTimer = 0.6;
    state.fishTimer = FISH.interval;
    state.heartTimer = HEART.interval;
    state.won = false;
    state.wavePhase = 0;
    state.speed = 0;
    state.wantedHeat = 0;
    state.wanted = 0;
    state.losTimer = 0;
    state.patrolTimer = 0;
    state.offerTimer = MISSION.offerAt;
    state.offerExpires = 0;
    state.speeding = false;
    state.banner = '';
    state.bannerTimer = 0;
    state.patrolsOff = false;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawnParticle(x, y, vx, vy, life, size) {
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (particle.active) continue;
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = vx;
      particle.vy = vy;
      particle.life = life;
      particle.size = size;
      return;
    }
  }

  function burst(x, y, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const power = speed * (0.4 + random() * 0.6);
      spawnParticle(x, y, Math.cos(angle) * power, Math.sin(angle) * power - 40, 0.4 + random() * 0.35, 2 + random() * 3);
    }
  }

  function scrollSpeed() {
    return OBSTACLE.scrollBase + OBSTACLE.scrollPerLevel * (state.level - 1);
  }

  function spawnObstacle() {
    const item = freeItem();
    if (item === null) return;
    const roll = random();
    item.active = true;
    item.phase = random() * Math.PI * 2;
    item.drift = (random() - 0.5) * 40;
    if (roll < 0.34) {
      item.kind = KIND_LOG;
      item.width = 110 + random() * 70;
      item.height = 26;
      item.speed = scrollSpeed() * (0.85 + random() * 0.3);
    } else if (roll < 0.62) {
      item.kind = KIND_CANOE;
      item.width = 116;
      item.height = 34;
      item.speed = scrollSpeed() * (0.7 + random() * 0.25);
    } else if (roll < 0.84) {
      item.kind = KIND_DRUM;
      item.width = 44;
      item.height = 44;
      item.speed = scrollSpeed() * (1.05 + random() * 0.3);
    } else {
      item.kind = KIND_BUOY;
      item.width = 36;
      item.height = 40;
      item.speed = scrollSpeed() * (0.6 + random() * 0.2);
    }
    item.x = random() * (FIELD.width - item.width);
    // A fair start: in the first seconds nothing spawns on the boat's column.
    if (state.elapsed < 4) {
      for (let attempt = 0; attempt < 5 && Math.abs(item.x + item.width / 2 - (boat.x + boat.width / 2)) < 170; attempt += 1) {
        item.x = random() * (FIELD.width - item.width);
      }
    }
    item.y = FIELD.waterTop - item.height - 4;
  }

  function spawnPickup(kind) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.phase = random() * Math.PI * 2;
    item.drift = 0;
    if (kind === KIND_SHELL) {
      item.width = SHELL.size;
      item.height = SHELL.size;
    } else if (kind === KIND_FISH) {
      item.width = FISH.width;
      item.height = FISH.height;
      item.drift = (random() < 0.5 ? -1 : 1) * (50 + random() * 60);
    } else if (kind === KIND_CRATE) {
      item.width = 34;
      item.height = 34;
    } else {
      item.width = HEART.size;
      item.height = HEART.size;
    }
    item.x = random() * (FIELD.width - item.width);
    item.y = FIELD.waterTop - item.height - 4;
    item.speed = scrollSpeed() * 0.9;
  }

  function obstacleInterval() {
    return Math.max(OBSTACLE.minInterval, OBSTACLE.interval * OBSTACLE.intervalScale ** (state.level - 1));
  }

  function starsFor(heat) {
    if (heat <= 0) return 0;
    return Math.min(5, Math.ceil(heat / WANTED.heatPerStar));
  }

  /** Can any active patrol see the boat? Pillars and mangroves break the sightline. */
  function patrolSees(patrol) {
    const bx = boat.x + boat.width / 2;
    const by = boat.y + boat.height / 2;
    for (let index = 0; index < MANGROVES.length; index += 1) {
      if (pointInRect(bx, by, MANGROVES[index])) return false;
    }
    const px = patrol.x + patrol.width / 2;
    const py = patrol.y + patrol.height / 2;
    for (let index = 0; index < PILLARS.length; index += 1) {
      if (segmentHitsRect(px, py, bx, by, PILLARS[index])) return false;
    }
    for (let index = 0; index < MANGROVES.length; index += 1) {
      if (segmentHitsRect(px, py, bx, by, MANGROVES[index])) return false;
    }
    return true;
  }

  function spawnPatrol() {
    for (let index = 0; index < patrols.length; index += 1) {
      const patrol = patrols[index];
      if (patrol.active) continue;
      patrol.active = true;
      patrol.vx = 0;
      patrol.vy = 0;
      patrol.losTimer = 0;
      patrol.cool = 0;
      // Launch from the top edge, near the boat's column so the chase reads at once.
      patrol.x = Math.min(FIELD.width - patrol.width, Math.max(0, boat.x + (random() - 0.5) * 400));
      patrol.y = FIELD.waterTop - patrol.height - 6;
      return true;
    }
    return false;
  }

  function offerMission() {
    mission.offered = true;
    mission.type = random() < 0.5 ? 'delivery' : 'crates';
    state.offerExpires = MISSION.offerExpires;
  }

  function startMission() {
    mission.active = true;
    mission.offered = false;
    mission.phase = 0;
    mission.got = 0;
    if (mission.type === 'delivery') {
      mission.timer = MISSION.deliveryTime;
      mission.reward = MISSION.deliveryReward;
      mission.cowries = MISSION.deliveryCowries;
      mission.need = 1;
      mission.tx = DOCK_A.x + DOCK_A.w / 2;
      mission.ty = DOCK_A.y + DOCK_A.h / 2;
    } else {
      mission.timer = MISSION.cratesTime;
      mission.reward = MISSION.cratesReward;
      mission.cowries = MISSION.cratesCowries;
      mission.need = MISSION.crateCount;
      for (let count = 0; count < MISSION.crateCount; count += 1) spawnPickup(KIND_CRATE);
    }
  }

  function endMission() {
    mission.active = false;
    mission.type = '';
    for (let index = 0; index < items.length; index += 1) {
      if (items[index].active && items[index].kind === KIND_CRATE) items[index].active = false;
    }
    state.offerTimer = MISSION.nextOffer;
  }

  function completeMission() {
    state.score += mission.reward;
    state.cowries += mission.cowries;
    state.banner = 'JOB DONE  +' + mission.reward;
    state.bannerTimer = 2.5;
    endMission();
    if (state.cowries >= WIN_SHELLS) {
      state.won = true;
      return EVENT_WIN;
    }
    return EVENT_MISSION;
  }

  /** The player accepts the offered job (E key). No offer, no effect. */
  function acceptMission() {
    if (mission.offered && !mission.active) startMission();
  }

  /** Staging helper for ?shot=play: heat, a patrol on the chase, a live job. */
  function stageChase() {
    state.wantedHeat = 55;
    state.wanted = starsFor(55);
    spawnPatrol();
  }

  /** Staging helper for ?shot=play: a delivery job already running. */
  function stageMission() {
    mission.offered = false;
    mission.type = 'delivery';
    startMission();
    mission.timer = 40;
  }

  /** Staging helper: keep patrols and heat out of a screenshot pre-roll. */
  function suppressPatrols(off) {
    state.patrolsOff = off;
  }

  /**
   * One fixed step. `move` is {x, y, pointer}: the keys' direction plus the
   * pointer target, or null. With `harmless` set (the title screen's backdrop)
   * things drift but nothing touches the boat and nothing scores.
   */
  function step(dt, move, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.wavePhase += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (state.bannerTimer > 0) state.bannerTimer = Math.max(0, state.bannerTimer - dt);

    // --- Boat physics: acceleration and drag, not teleporting. ---
    // Keys push along a direction; the pointer pulls toward a point. At speed,
    // steering sideways is weaker than steering along the run, so the boat
    // slides through turns and has to be braked, GTA-style.
    let ax = 0;
    let ay = 0;
    let steering = false;
    if (move.pointer !== null) {
      const centreX = boat.x + boat.width / 2;
      const centreY = boat.y + boat.height / 2;
      const dx = move.pointer.x - centreX;
      const dy = move.pointer.y - centreY;
      const distance = Math.hypot(dx, dy);
      if (distance > 6) {
        const want = Math.min(1, distance / 120) * PHYSICS.maxSpeed;
        ax = ((dx / distance) * want - boat.vx) * 3;
        ay = ((dy / distance) * want - boat.vy) * 3;
        steering = true;
      }
    } else if (move.x !== 0 || move.y !== 0) {
      const length = Math.hypot(move.x, move.y);
      ax = (move.x / length) * PHYSICS.accel;
      ay = (move.y / length) * PHYSICS.accel;
      steering = true;
    }
    if (steering) {
      // Split the push into along-motion and sideways; sideways is throttled
      // at speed, which is what makes fast turns wide and drifty.
      const speedNow = Math.hypot(boat.vx, boat.vy);
      if (speedNow > 1) {
        const fx = boat.vx / speedNow;
        const fy = boat.vy / speedNow;
        const along = ax * fx + ay * fy;
        let sx = ax - along * fx;
        let sy = ay - along * fy;
        const keep = 1 - PHYSICS.turn * Math.min(1, speedNow / PHYSICS.maxSpeed);
        sx *= keep;
        sy *= keep;
        ax = along * fx + sx;
        ay = along * fy + sy;
      }
      boat.vx += ax * dt;
      boat.vy += ay * dt;
      const drag = Math.exp(-PHYSICS.cruiseDrag * dt);
      boat.vx *= drag;
      boat.vy *= drag;
    } else {
      const drag = Math.exp(-PHYSICS.drag * dt);
      boat.vx *= drag;
      boat.vy *= drag;
      if (Math.abs(boat.vx) < 4) boat.vx = 0;
      if (Math.abs(boat.vy) < 4) boat.vy = 0;
    }
    const speed = Math.hypot(boat.vx, boat.vy);
    if (speed > PHYSICS.maxSpeed) {
      boat.vx = (boat.vx / speed) * PHYSICS.maxSpeed;
      boat.vy = (boat.vy / speed) * PHYSICS.maxSpeed;
    }
    state.speed = Math.hypot(boat.vx, boat.vy);
    boat.x = Math.min(BOAT.maxX, Math.max(BOAT.minX, boat.x + boat.vx * dt));
    boat.y = Math.min(BOAT.maxY, Math.max(BOAT.minY, boat.y + boat.vy * dt));
    // A hard stop at the edge kills the slide, as a bank would.
    if ((boat.x === BOAT.minX && boat.vx < 0) || (boat.x === BOAT.maxX && boat.vx > 0)) boat.vx = 0;
    if ((boat.y === BOAT.minY && boat.vy < 0) || (boat.y === BOAT.maxY && boat.vy > 0)) boat.vy = 0;
    boat.tilt = Math.max(-0.22, Math.min(0.22, boat.vx * 0.0004));
    if (boat.invulnerable > 0) boat.invulnerable = Math.max(0, boat.invulnerable - dt);

    // Wake: spray at the stern, heavier the faster the boat runs.
    if (state.speed > 60 && random() < 0.15 + state.speed / PHYSICS.maxSpeed * 0.5) {
      const backX = boat.x + boat.width / 2 - (boat.vx / Math.max(1, state.speed)) * 46;
      const backY = boat.y + boat.height - 4 - (boat.vy / Math.max(1, state.speed)) * 30;
      spawnParticle(backX + (random() - 0.5) * 30, backY, -boat.vx * 0.2 + (random() - 0.5) * 40, 60 + random() * 40, 0.5, 2 + random() * 2);
    }

    if (harmless) {
      // Title backdrop: drift the world and keep spawning, nothing more.
      state.obstacleTimer -= dt;
      if (state.obstacleTimer <= 0) {
        spawnObstacle();
        state.obstacleTimer += obstacleInterval();
      }
      state.shellTimer -= dt;
      if (state.shellTimer <= 0) {
        spawnPickup(KIND_SHELL);
        state.shellTimer += SHELL.interval + random() * SHELL.intervalJitter;
      }
      state.fishTimer -= dt;
      if (state.fishTimer <= 0) {
        spawnPickup(KIND_FISH);
        state.fishTimer += FISH.interval + random() * FISH.intervalJitter;
      }
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.active) continue;
        item.y += item.speed * dt;
        if (item.y > FIELD.height + 20) item.active = false;
      }
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!particle.active) continue;
        particle.life -= dt;
        if (particle.life <= 0) { particle.active = false; continue; }
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 260 * dt;
      }
      return 0;
    }

    // --- Wanted: crimes raise heat; hiding sheds it. ---
    state.speeding = false;
    if (!state.patrolsOff) {
      for (let index = 0; index < NO_WAKE.length; index += 1) {
        const zone = NO_WAKE[index];
        const cx = boat.x + boat.width / 2;
        const cy = boat.y + boat.height / 2;
        if (cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h && state.speed > WANTED.noWakeSpeed) {
          state.wantedHeat = Math.min(100, state.wantedHeat + WANTED.noWakeHeat * dt);
          state.speeding = true;
        }
      }
    }
    let anySeen = false;
    let activePatrols = 0;
    for (let index = 0; index < patrols.length; index += 1) {
      if (patrols[index].active) activePatrols += 1;
    }
    if (activePatrols > 0) {
      for (let index = 0; index < patrols.length; index += 1) {
        const patrol = patrols[index];
        if (!patrol.active) continue;
        if (patrolSees(patrol)) {
          anySeen = true;
          patrol.losTimer = 0;
        } else {
          patrol.losTimer += dt;
          if (patrol.losTimer > PATROL.giveUp) {
            patrol.active = false;
            burst(patrol.x + patrol.width / 2, patrol.y + patrol.height / 2, 8, 100);
          }
        }
      }
    }
    if (anySeen) state.losTimer = 0;
    else state.losTimer += dt;
    if (!state.patrolsOff) {
      if (state.losTimer > WANTED.hiddenSeconds) state.wantedHeat = Math.max(0, state.wantedHeat - WANTED.decayHidden * dt);
      else state.wantedHeat = Math.max(0, state.wantedHeat - WANTED.decayVisible * dt);
      state.wanted = starsFor(state.wantedHeat);
      if (state.wanted === 0) {
        for (let index = 0; index < patrols.length; index += 1) {
          if (patrols[index].active) {
            patrols[index].active = false;
            burst(patrols[index].x + patrols[index].width / 2, patrols[index].y + patrols[index].height / 2, 8, 100);
          }
        }
      }
    }

    // --- Patrols: spawn to the wanted level, chase, ram, give up. ---
    if (!state.patrolsOff) {
      const allowed = state.wanted >= 4 ? 2 : state.wanted >= 2 ? 1 : 0;
      state.patrolTimer -= dt;
      if (activePatrols < allowed && state.patrolTimer <= 0) {
        if (spawnPatrol()) events |= EVENT_SIREN;
        state.patrolTimer = PATROL.spawnInterval;
      }
      const bx = boat.x + boat.width / 2;
      const by = boat.y + boat.height / 2;
      for (let index = 0; index < patrols.length; index += 1) {
        const patrol = patrols[index];
        if (!patrol.active) continue;
        if (patrol.cool > 0) patrol.cool -= dt;
        // Intercept: aim where the boat will be, not where it is.
        const px = patrol.x + patrol.width / 2;
        const py = patrol.y + patrol.height / 2;
        const tx = bx + boat.vx * 0.6;
        const ty = by + boat.vy * 0.6;
        const dx = tx - px;
        const dy = ty - py;
        const distance = Math.hypot(dx, dy) || 1;
        patrol.vx += (dx / distance) * PATROL.accel * dt;
        patrol.vy += (dy / distance) * PATROL.accel * dt;
        const drag = Math.exp(-0.5 * dt);
        patrol.vx *= drag;
        patrol.vy *= drag;
        const pspeed = Math.hypot(patrol.vx, patrol.vy);
        if (pspeed > PATROL.speed) {
          patrol.vx = (patrol.vx / pspeed) * PATROL.speed;
          patrol.vy = (patrol.vy / pspeed) * PATROL.speed;
        }
        patrol.x += patrol.vx * dt;
        patrol.y += patrol.vy * dt;
        if (patrol.x < 0) { patrol.x = 0; patrol.vx = Math.abs(patrol.vx); }
        if (patrol.x + patrol.width > FIELD.width) { patrol.x = FIELD.width - patrol.width; patrol.vx = -Math.abs(patrol.vx); }
        if (patrol.y < FIELD.waterTop - patrol.height) { patrol.y = FIELD.waterTop - patrol.height; patrol.vy = Math.abs(patrol.vy); }
        if (patrol.y + patrol.height > FIELD.height) { patrol.y = FIELD.height - patrol.height; patrol.vy = -Math.abs(patrol.vy); }
        if (patrol.cool <= 0 && overlaps(patrol, boat)) {
          if (boat.invulnerable === 0) {
            state.lives -= 1;
            boat.invulnerable = BOAT.invulnerable;
            state.wantedHeat = Math.min(100, state.wantedHeat + WANTED.ramHeat);
            state.wanted = starsFor(state.wantedHeat);
            burst(bx, by, 18, 220);
            events |= EVENT_HIT;
            // The ram throws the patrol back so it cannot hit twice at once.
            patrol.vx = -patrol.vx * 0.6 + (px < bx ? -260 : 260);
            patrol.vy = -patrol.vy * 0.6;
            patrol.cool = 3;
            if (state.lives === 0) {
              events |= EVENT_OVER;
              return events;
            }
          } else {
            patrol.cool = 1;
          }
        }
      }
    }

    // --- Missions: offers, timers, targets. ---
    if (!mission.active) {
      if (mission.offered) {
        state.offerExpires -= dt;
        if (state.offerExpires <= 0) {
          mission.offered = false;
          mission.type = '';
          state.offerTimer = MISSION.nextOffer;
        }
      } else {
        state.offerTimer -= dt;
        if (state.offerTimer <= 0) offerMission();
      }
    } else {
      mission.timer -= dt;
      if (mission.timer <= 0) {
        state.banner = 'JOB FAILED';
        state.bannerTimer = 2.5;
        endMission();
      } else if (mission.type === 'delivery' && mission.phase === 0) {
        const bx = boat.x + boat.width / 2;
        const by = boat.y + boat.height / 2;
        if (Math.hypot(bx - mission.tx, by - mission.ty) < 80) {
          mission.phase = 1;
          mission.tx = DOCK_B.x + DOCK_B.w / 2;
          mission.ty = DOCK_B.y + DOCK_B.h / 2;
          state.banner = 'CARGO ON BOARD — DELIVER IT';
          state.bannerTimer = 2;
        }
      } else if (mission.type === 'delivery' && mission.phase === 1) {
        const bx = boat.x + boat.width / 2;
        const by = boat.y + boat.height / 2;
        if (Math.hypot(bx - mission.tx, by - mission.ty) < 80) {
          const winEvents = completeMission();
          events |= winEvents;
          if (winEvents & EVENT_WIN) return events;
        }
      }
    }

    state.obstacleTimer -= dt;
    if (state.obstacleTimer <= 0) {
      spawnObstacle();
      state.obstacleTimer += obstacleInterval();
    }
    state.shellTimer -= dt;
    if (state.shellTimer <= 0) {
      spawnPickup(KIND_SHELL);
      state.shellTimer += SHELL.interval + random() * SHELL.intervalJitter;
    }
    state.fishTimer -= dt;
    if (state.fishTimer <= 0) {
      spawnPickup(KIND_FISH);
      state.fishTimer += FISH.interval + random() * FISH.intervalJitter;
    }
    state.heartTimer -= dt;
    if (state.heartTimer <= 0) {
      if (state.lives < LIVES) spawnPickup(KIND_HEART);
      state.heartTimer += HEART.interval;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      item.x += item.drift * dt;
      if (item.x < 0) { item.x = 0; item.drift = Math.abs(item.drift); }
      if (item.x + item.width > FIELD.width) { item.x = FIELD.width - item.width; item.drift = -Math.abs(item.drift); }
      if (item.y > FIELD.height + 20) {
        item.active = false;
        if (item.kind <= KIND_BUOY) state.score += OBSTACLE.dodgePoints;
        continue;
      }
      if (!overlaps(item, boat)) continue;
      if (item.kind === KIND_SHELL) {
        item.active = false;
        state.score += SHELL.points;
        state.cowries += 1;
        burst(item.x + item.width / 2, item.y + item.height / 2, 10, 130);
        events |= EVENT_PICKUP;
        if (state.cowries >= WIN_SHELLS) {
          state.won = true;
          events |= EVENT_WIN;
          return events;
        }
      } else if (item.kind === KIND_FISH) {
        item.active = false;
        state.score += FISH.points;
        burst(item.x + item.width / 2, item.y + item.height / 2, 12, 150);
        events |= EVENT_FISH;
      } else if (item.kind === KIND_HEART) {
        item.active = false;
        state.lives = Math.min(LIVES, state.lives + 1);
        burst(item.x + item.width / 2, item.y + item.height / 2, 10, 120);
        events |= EVENT_HEART;
      } else if (item.kind === KIND_CRATE) {
        if (mission.active && mission.type === 'crates') {
          item.active = false;
          mission.got += 1;
          state.score += 10;
          burst(item.x + item.width / 2, item.y + item.height / 2, 8, 120);
          events |= EVENT_PICKUP;
          if (mission.got >= mission.need) {
            const winEvents = completeMission();
            events |= winEvents;
            if (winEvents & EVENT_WIN) return events;
          }
        }
      } else if (boat.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        boat.invulnerable = BOAT.invulnerable;
        if (!state.patrolsOff) {
          if (item.kind === KIND_CANOE) state.wantedHeat = Math.min(100, state.wantedHeat + WANTED.canoeHeat);
          else if (item.kind === KIND_BUOY) state.wantedHeat = Math.min(100, state.wantedHeat + WANTED.buoyHeat);
          state.wanted = starsFor(state.wantedHeat);
        }
        burst(boat.x + boat.width / 2, boat.y + boat.height / 2, 18, 220);
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          return events;
        }
      }
    }

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) { particle.active = false; continue; }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 260 * dt;
    }
    return events;
  }

  reset();
  return { state, reset, step, burst, acceptMission, stageChase, stageMission, suppressPatrols };
}
