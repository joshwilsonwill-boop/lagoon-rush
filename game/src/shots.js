// The screenshot scenes behind ?shot=start|play|end|win. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (look ahead each way the boat could move, keep clear of the
// drift, chase the nearest cowrie when that is safe), so the frame is what a
// short game really looks like and the same seed always gives the same frame.

import { BOAT, FIELD, NO_WAKE, PHYSICS, STEP, WANTED } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_BUOY, KIND_CANOE, KIND_DRUM, KIND_LOG } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;
const WIN_LIMIT_SECONDS = 600;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the
 * play scene's pilot looks well ahead and keeps its lives; the end scene's looks
 * only a moment ahead, so it is caught out once the drift speeds up, as a
 * hurried player is; the win scene's looks furthest ahead and chases shells.
 */
const HORIZON_PLAY = 0.8;
const HORIZON_END = 0.25;
const HORIZON_WIN = 1.4;
const SAMPLE = 1 / 30;
/** Extra room, each side, it keeps between the boat and an obstacle. */
const MARGIN = 14;

function isObstacle(kind) {
  return kind === KIND_LOG || kind === KIND_CANOE || kind === KIND_DRUM || kind === KIND_BUOY;
}

/** Where the boat would be after `t` seconds holding `move`, using the same
 * acceleration, drift and drag as world.js: the pilot must plan for a boat
 * that takes time to get moving and slides through turns. */
function predictPosition(state, move, t) {
  let x = state.boat.x;
  let y = state.boat.y;
  let vx = state.boat.vx;
  let vy = state.boat.vy;
  const steps = Math.max(1, Math.round(t / STEP));
  const dt = t / steps;
  for (let s = 0; s < steps; s += 1) {
    if (move.x !== 0 || move.y !== 0) {
      const length = Math.hypot(move.x, move.y);
      let ax = (move.x / length) * PHYSICS.accel;
      let ay = (move.y / length) * PHYSICS.accel;
      const speedNow = Math.hypot(vx, vy);
      if (speedNow > 1) {
        const fx = vx / speedNow;
        const fy = vy / speedNow;
        const along = ax * fx + ay * fy;
        let sx = ax - along * fx;
        let sy = ay - along * fy;
        const keep = 1 - PHYSICS.turn * Math.min(1, speedNow / PHYSICS.maxSpeed);
        sx *= keep;
        sy *= keep;
        ax = along * fx + sx;
        ay = along * fy + sy;
      }
      vx += ax * dt;
      vy += ay * dt;
      const drag = Math.exp(-PHYSICS.cruiseDrag * dt);
      vx *= drag;
      vy *= drag;
    } else {
      const drag = Math.exp(-PHYSICS.drag * dt);
      vx *= drag;
      vy *= drag;
    }
    const speed = Math.hypot(vx, vy);
    if (speed > PHYSICS.maxSpeed) {
      vx = (vx / speed) * PHYSICS.maxSpeed;
      vy = (vy / speed) * PHYSICS.maxSpeed;
    }
    x = Math.min(BOAT.maxX, Math.max(BOAT.minX, x + vx * dt));
    y = Math.min(BOAT.maxY, Math.max(BOAT.minY, y + vy * dt));
  }
  return [x, y, vx, vy];
}

/** Seconds until moving with `move` runs the boat into an obstacle, a patrol
 * boat, or a no-wake zone at speed; Infinity when it never does. */
function timeToHit(state, move, horizon) {
  const boat = state.boat;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const [x, y, vx, vy] = predictPosition(state, move, t);
    const speed = Math.hypot(vx, vy);
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || !isObstacle(item.kind)) continue;
      const iy = item.y + item.speed * t;
      if (iy + item.height > y && iy < y + boat.height && item.x < x + boat.width + MARGIN && item.x + item.width > x - MARGIN) return t;
    }
    for (let index = 0; index < state.patrols.length; index += 1) {
      const patrol = state.patrols[index];
      if (!patrol.active) continue;
      const px = patrol.x + patrol.vx * t;
      const py = patrol.y + patrol.vy * t;
      if (py + patrol.height > y && py < y + boat.height && px < x + boat.width + MARGIN && px + patrol.width > x - MARGIN) return t;
    }
    // Speeding through a no-wake zone is a crime: the pilot brakes first.
    if (speed > WANTED.noWakeSpeed) {
      const cx = x + boat.width / 2;
      const cy = y + boat.height / 2;
      for (let index = 0; index < NO_WAKE.length; index += 1) {
        const zone = NO_WAKE[index];
        if (cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h) return t;
      }
    }
  }
  return Infinity;
}

/** Of the safe ways to move, the one toward the nearest shell or fish; else the one hit last. */
function autopilot(state, horizon) {
  const boat = state.boat;
  let target = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || isObstacle(item.kind)) continue;
    if (target === null || item.y > target.y) target = item;
  }
  const centreX = boat.x + boat.width / 2;
  const centreY = boat.y + boat.height / 2;
  const wanted = { x: 0, y: 0, pointer: null };
  if (target !== null) {
    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;
    wanted.x = tx > centreX + 10 ? 1 : tx < centreX - 10 ? -1 : 0;
    wanted.y = ty > centreY + 10 ? 1 : ty < centreY - 10 ? -1 : 0;
  }
  let best = wanted;
  let bestTime = timeToHit(state, wanted, horizon);
  const options = [
    { x: 0, y: 0, pointer: null }, { x: -1, y: 0, pointer: null }, { x: 1, y: 0, pointer: null },
    { x: 0, y: -1, pointer: null }, { x: 0, y: 1, pointer: null }, { x: -1, y: -1, pointer: null },
    { x: 1, y: -1, pointer: null }, { x: -1, y: 1, pointer: null }, { x: 1, y: 1, pointer: null },
  ];
  for (let index = 0; index < options.length && bestTime !== Infinity; index += 1) {
    const time = timeToHit(state, options[index], horizon);
    if (time > bestTime) {
      bestTime = time;
      best = options[index];
    }
  }
  return best;
}

/**
 * Set `world` to the named scene (start, play, end or win; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { x: 0, y: 0, pointer: null }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'play' ? PLAY_SECONDS : name === 'win' ? WIN_LIMIT_SECONDS : END_LIMIT_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : name === 'win' ? HORIZON_WIN : HORIZON_PLAY;
  // The play scene is the showcase: keep patrols out of the pre-roll so the
  // boat is alive at 30 seconds, then stage the chase and a live job on top.
  if (name === 'play') world.suppressPatrols(true);
  let won = false;
  for (let index = 0; index < limit / STEP; index += 1) {
    // In the win scene the pilot takes every job offered: crate runs pay in
    // cowries, and the pilot already chases crates like shells.
    if (name === 'win' && world.state.mission.offered) world.acceptMission();
    const events = world.step(STEP, autopilot(world.state, horizon), false);
    if (events & EVENT_WIN) { won = true; break; }
    if (events & EVENT_OVER) break;
  }
  if (name === 'play' && !won && world.state.lives > 0) {
    world.suppressPatrols(false);
    world.stageChase();
    world.stageMission();
    for (let index = 0; index < 2 / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, horizon), false);
      if (world.state.lives === 0) break;
    }
    // The boat must be visible in the frame, never caught mid-blink.
    world.state.boat.invulnerable = 0;
  }
  if (won || world.state.won) return { screen: SCREEN_WIN, best: world.state.score };
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
