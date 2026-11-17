// The game's rules and state, with no drawing and no browser in it: the boat,
// the pool of drifting logs, canoes, drums and buoys, the cowrie shells, golden
// catfish and hearts, spawning, collisions, score, lives and level. step()
// advances one fixed step and returns what happened as bit flags, so the caller
// can react (and play a sound) without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import { BOAT, FIELD, FISH, HEART, LEVEL, LIVES, OBSTACLE, PARTICLE_POOL, POOL_SIZE, SHELL, WIN_SHELLS } from './config.js';

export const KIND_LOG = 0;
export const KIND_CANOE = 1;
export const KIND_DRUM = 2;
export const KIND_BUOY = 3;
export const KIND_SHELL = 4;
export const KIND_FISH = 5;
export const KIND_HEART = 6;

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_FISH = 4;
export const EVENT_HEART = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
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
  const state = {
    boat, items, particles, score: 0, cowries: 0, lives: LIVES, level: 1,
    elapsed: 0, obstacleTimer: 0, shellTimer: 0, fishTimer: 0, heartTimer: 0,
    won: false, wavePhase: 0,
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

    // Steering: keys push the boat, the pointer pulls it toward the touch point.
    let vx = move.x * BOAT.speed;
    let vy = move.y * BOAT.speed;
    if (move.pointer !== null) {
      const centreX = boat.x + boat.width / 2;
      const centreY = boat.y + boat.height / 2;
      const dx = move.pointer.x - centreX;
      const dy = move.pointer.y - centreY;
      const distance = Math.hypot(dx, dy);
      if (distance > 6) {
        const pull = Math.min(1, distance / 120) * BOAT.speed;
        vx = (dx / distance) * pull;
        vy = (dy / distance) * pull;
      } else {
        vx = 0;
        vy = 0;
      }
    }
    boat.vx = vx;
    boat.vy = vy;
    boat.x = Math.min(BOAT.maxX, Math.max(BOAT.minX, boat.x + vx * dt));
    boat.y = Math.min(BOAT.maxY, Math.max(BOAT.minY, boat.y + vy * dt));
    boat.tilt = Math.max(-0.16, Math.min(0.16, vx * 0.00035));
    if (boat.invulnerable > 0) boat.invulnerable = Math.max(0, boat.invulnerable - dt);

    // Wake: a droplet behind the boat every few steps while it moves.
    if ((vx !== 0 || vy !== 0) && random() < 0.25) {
      spawnParticle(boat.x + boat.width / 2 + (random() - 0.5) * 30, boat.y + boat.height - 4, (random() - 0.5) * 30, 60 + random() * 40, 0.5, 2 + random() * 2);
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
        if (!harmless && item.kind <= KIND_BUOY) state.score += OBSTACLE.dodgePoints;
        continue;
      }
      if (harmless || !overlaps(item, boat)) continue;
      if (item.kind === KIND_SHELL) {
        item.active = false;
        state.score += SHELL.points;
        state.cowries += 1;
        burst(item.x + item.width / 2, item.y + item.height / 2, 10, 130);
        events |= EVENT_PICKUP;
        if (state.cowries >= WIN_SHELLS) {
          state.won = true;
          events |= EVENT_WIN;
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
      } else if (boat.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        boat.invulnerable = BOAT.invulnerable;
        burst(boat.x + boat.width / 2, boat.y + boat.height / 2, 18, 220);
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
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
  return { state, reset, step, burst };
}
