// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. The lagoon fills the lower two thirds; the sky, sun and
// Lagos skyline sit above the horizon.

export const FIELD = { width: 1280, height: 720, horizonY: 240, waterTop: 250 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const BOAT = {
  width: 96,
  height: 44,
  speed: 430,
  invulnerable: 2,
  minX: 0,
  maxX: 1184,
  minY: 282,
  maxY: 664,
};

/** Cowrie shells to collect before the boat reaches Eko Marina and wins. */
export const WIN_SHELLS = 30;

export const LIVES = 3;

export const OBSTACLE = {
  scrollBase: 175,
  scrollPerLevel: 20,
  interval: 0.62,
  intervalScale: 0.9,
  minInterval: 0.2,
  dodgePoints: 2,
};

export const SHELL = {
  size: 26,
  interval: 1.05,
  intervalJitter: 0.6,
  points: 10,
};

export const FISH = {
  width: 36,
  height: 22,
  interval: 6.5,
  intervalJitter: 3,
  points: 25,
};

export const HEART = {
  size: 28,
  interval: 24,
  points: 0,
};

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 15, max: 10 };

/** How many drifting things and splash particles can exist at once; pools are allocated once. */
export const POOL_SIZE = 72;
export const PARTICLE_POOL = 96;

export const PALETTE = {
  backdrop: '#1a1030',
  skyTop: '#2b1a4e',
  skyMid: '#c94b6d',
  skyLow: '#ff8a4c',
  sun: '#ffd76a',
  sunGlow: '#ff9d4d',
  skyline: '#241640',
  skylineFar: '#3a2560',
  waterTop: '#0f7d8c',
  waterDeep: '#074b63',
  wave: '#bfeef2',
  foam: '#e8fbff',
  hull: '#8a5a2b',
  hullDark: '#5f3c1a',
  canopy: '#f2e3c6',
  flag: '#ff5a3c',
  log: '#7a4a21',
  canoe: '#c98a3d',
  drum: '#d84a2f',
  buoy: '#ff7a1a',
  shell: '#fff3d6',
  shellSlit: '#8a6d3b',
  fish: '#ffc93c',
  heart: '#ff4d6d',
  panel: '#160f2ee6',
  text: '#fff6e8',
  muted: '#d8c9b8',
  accent: '#ffd76a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lagoon-rush.best';
