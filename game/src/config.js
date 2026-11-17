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

/** GTA-style handling: the boat accelerates into motion and slides out of it. */
export const PHYSICS = {
  /** Pixels per second squared the engine (or the pointer pull) can add. */
  accel: 1700,
  /** Top speed; the old instant speed was 430, so a flat-out run is quicker. */
  maxSpeed: 480,
  /** Drag when no input is held: the boat glides to a stop in about a second. */
  drag: 1.6,
  /** Drag while steering: set so flat-out top speed is the clamp, reached in about a second. */
  cruiseDrag: 3.1,
  /** How much of the steering push survives sideways at top speed (drift). */
  turn: 0.55,
};

/** Wanted heat 0-100; stars are one per 20 heat. */
export const WANTED = {
  heatPerStar: 20,
  canoeHeat: 25,
  buoyHeat: 15,
  /** Heat per second for speeding through a no-wake zone. */
  noWakeHeat: 9,
  noWakeSpeed: 230,
  /** Heat lost per second while a patrol can see the boat. */
  decayVisible: 0.8,
  /** Heat lost per second once the boat has been unseen for hiddenSeconds. */
  decayHidden: 25,
  hiddenSeconds: 3.5,
  ramHeat: 8,
};

export const PATROL = {
  max: 2,
  speed: 400,
  accel: 900,
  spawnInterval: 2,
  /** Seconds without line of sight before a patrol gives up and leaves. */
  giveUp: 8,
};

export const MISSION = {
  offerAt: 10,
  offerExpires: 10,
  nextOffer: 12,
  deliveryTime: 60,
  cratesTime: 60,
  deliveryReward: 150,
  deliveryCowries: 3,
  cratesReward: 120,
  cratesCowries: 2,
  crateCount: 5,
};

/** Slow zones: speeding inside one is a crime. */
export const NO_WAKE = [
  { x: 0, y: 470, w: 150, h: 190 },
  { x: 1130, y: 290, w: 150, h: 190 },
];

/** Bridge pillars: a patrol's line of sight dies crossing one. */
export const PILLARS = [
  { x: 300, y: 240, w: 44, h: 110 },
  { x: 640, y: 240, w: 44, h: 110 },
  { x: 980, y: 240, w: 44, h: 110 },
];

/** Mangrove thickets at the water's edge: inside one, no patrol can see the boat. */
export const MANGROVES = [
  { x: 0, y: 270, w: 110, h: 140 },
  { x: 1170, y: 560, w: 110, h: 120 },
];

export const DOCK_A = { x: 30, y: 590, w: 100, h: 26 };
export const DOCK_B = { x: 1150, y: 320, w: 100, h: 26 };

/** Cowrie shells to collect before the boat reaches Eko Marina and wins. */
export const WIN_SHELLS = 30;

export const LIVES = 3;

export const OBSTACLE = {
  scrollBase: 175,
  scrollPerLevel: 15,
  interval: 0.62,
  intervalScale: 0.92,
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
  patrol: '#1d2f57',
  patrolStripe: '#e8f4ff',
  beaconRed: '#ff3b30',
  beaconBlue: '#2f7bff',
  mangrove: '#0d3b26',
  mangroveTop: '#17603a',
  zone: '#ffb020',
  dock: '#6b4423',
  crate: '#b07a35',
  crateDark: '#7a5220',
  ring: '#ffd76a',
  panel: '#160f2ee6',
  text: '#fff6e8',
  muted: '#d8c9b8',
  accent: '#ffd76a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lagoon-rush.best';
