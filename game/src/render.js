// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Sunset sky, Lagos skyline and bridge, lagoon water,
// the boat and its wake, then the HUD and the screen's panel. Text that holds a
// number is rebuilt only when the number changes, so a frame allocates nothing.

import { DOCK_A, DOCK_B, FIELD, FONT, LIVES, MANGROVES, NO_WAKE, PALETTE, PILLARS, WIN_SHELLS } from './config.js';
import { KIND_BUOY, KIND_CANOE, KIND_CRATE, KIND_DRUM, KIND_FISH, KIND_HEART, KIND_LOG, KIND_SHELL } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 700, top: 150, line: 32, bottom: 74 };
const HEART_SIZE = 22;
const HEART_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawSky(state) {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.horizonY);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.horizonY + 2);

    // Low sun, glowing, sinking toward the lagoon.
    const sunX = 1020;
    const sunY = 168;
    const glow = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
    glow.addColorStop(0, PALETTE.sunGlow);
    glow.addColorStop(1, 'rgba(255,157,77,0)');
    context.fillStyle = glow;
    context.fillRect(sunX - 150, sunY - 150, 300, 300);
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(sunX, sunY, 46, 0, Math.PI * 2);
    context.fill();

    // Slow clouds, drifting with the wave phase so the title backdrop lives.
    context.fillStyle = 'rgba(255,214,180,0.28)';
    for (let index = 0; index < 4; index += 1) {
      const cx = ((index * 340 + state.wavePhase * (6 + index * 3)) % 1500) - 110;
      const cy = 52 + index * 34;
      context.beginPath();
      context.ellipse(cx, cy, 74, 15, 0, 0, Math.PI * 2);
      context.ellipse(cx + 44, cy + 6, 52, 12, 0, 0, Math.PI * 2);
      context.fill();
    }

    // Birds: two small chevrons crossing the sky.
    context.strokeStyle = 'rgba(30,16,48,0.8)';
    context.lineWidth = 3;
    for (let index = 0; index < 3; index += 1) {
      const bx = ((index * 420 + state.wavePhase * 26) % 1400) - 60;
      const by = 84 + index * 26;
      context.beginPath();
      context.moveTo(bx - 12, by);
      context.quadraticCurveTo(bx - 4, by - 8, bx, by);
      context.quadraticCurveTo(bx + 4, by - 8, bx + 12, by);
      context.stroke();
    }

    // Far skyline, then the near one with the Third Mainland Bridge.
    context.fillStyle = PALETTE.skylineFar;
    const far = [60, 150, 90, 210, 120, 170, 100, 190, 130, 80, 160, 110];
    let fx = 0;
    for (let index = 0; index < far.length; index += 1) {
      context.fillRect(fx, FIELD.horizonY - far[index] * 0.55, 96, far[index] * 0.55);
      fx += 108;
    }
    context.fillStyle = PALETTE.skyline;
    const near = [90, 60, 140, 70, 110, 190, 80, 130, 100, 150, 70, 120];
    let nx = -20;
    for (let index = 0; index < near.length; index += 1) {
      context.fillRect(nx, FIELD.horizonY - near[index] * 0.8, 88, near[index] * 0.8);
      if (index === 5) {
        // The tall tower with its lit crown.
        context.fillStyle = PALETTE.accent;
        context.fillRect(nx + 34, FIELD.horizonY - near[index] * 0.8 - 12, 20, 12);
        context.fillStyle = PALETTE.skyline;
      }
      nx += 112;
    }
    // Bridge deck and cables across the horizon.
    context.fillStyle = PALETTE.skyline;
    context.fillRect(0, FIELD.horizonY - 14, FIELD.width, 14);
    context.strokeStyle = PALETTE.skyline;
    context.lineWidth = 3;
    for (let index = 0; index < 9; index += 1) {
      const px = 120 + index * 140;
      context.beginPath();
      context.moveTo(px, FIELD.horizonY - 14);
      context.lineTo(px + 70, FIELD.horizonY - 62);
      context.lineTo(px + 140, FIELD.horizonY - 14);
      context.stroke();
    }
    context.fillStyle = PALETTE.accent;
    for (let index = 0; index < 12; index += 1) {
      context.fillRect(40 + index * 108, FIELD.horizonY - 22, 4, 4);
    }
  }

  function drawWater(state) {
    const water = context.createLinearGradient(0, FIELD.waterTop, 0, FIELD.height);
    water.addColorStop(0, PALETTE.waterTop);
    water.addColorStop(1, PALETTE.waterDeep);
    context.fillStyle = water;
    context.fillRect(0, FIELD.waterTop, FIELD.width, FIELD.height - FIELD.waterTop);
    // Sun glitter on the water.
    context.fillStyle = 'rgba(255,215,106,0.35)';
    for (let index = 0; index < 10; index += 1) {
      const gx = 980 + Math.sin(state.wavePhase * 1.3 + index * 1.7) * (30 + index * 14);
      const gy = FIELD.waterTop + 18 + index * 26;
      context.fillRect(gx, gy, 44 - index * 2, 3);
    }
    // Rolling wave lines.
    context.strokeStyle = 'rgba(191,238,242,0.4)';
    context.lineWidth = 2;
    for (let row = 0; row < 7; row += 1) {
      const wy = 300 + row * 58;
      context.beginPath();
      for (let x = 0; x <= FIELD.width; x += 16) {
        const y = wy + Math.sin(x * 0.012 + state.wavePhase * 1.6 + row) * 5;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
  }

  function drawZones(state) {
    // No-wake zones: dashed amber frames with a label.
    context.strokeStyle = PALETTE.zone;
    context.lineWidth = 2;
    context.setLineDash([10, 8]);
    for (let index = 0; index < NO_WAKE.length; index += 1) {
      const zone = NO_WAKE[index];
      // The fill must be set per zone: text() below resets it to solid.
      context.fillStyle = 'rgba(255,176,32,0.07)';
      context.fillRect(zone.x, zone.y, zone.w, zone.h);
      context.strokeRect(zone.x, zone.y, zone.w, zone.h);
      text('NO WAKE', zone.x + zone.w / 2, zone.y + 16, 13, PALETTE.zone, 'center', 'top');
    }
    context.setLineDash([]);
    // Docks: wooden platforms at the water's edge.
    const docks = [DOCK_A, DOCK_B];
    for (let index = 0; index < docks.length; index += 1) {
      const dock = docks[index];
      context.fillStyle = PALETTE.dock;
      context.fillRect(dock.x, dock.y, dock.w, dock.h);
      context.fillStyle = '#8a5a2b';
      for (let px = dock.x + 6; px < dock.x + dock.w; px += 18) context.fillRect(px, dock.y + 4, 10, 4);
    }
    // Mission target ring: a pulsing gold circle on the active target.
    const mission = state.mission;
    if (mission.active) {
      const radius = 46 + Math.sin(state.wavePhase * 5) * 5;
      context.strokeStyle = PALETTE.ring;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(mission.tx, mission.ty, radius, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.ring;
      context.beginPath();
      context.arc(mission.tx, mission.ty, 6, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPillars() {
    // Bridge pillars: dark columns the boat can slip behind. They sit behind
    // the boat so the player never loses sight of their own hull.
    for (let index = 0; index < PILLARS.length; index += 1) {
      const pillar = PILLARS[index];
      context.fillStyle = '#1c1038';
      context.fillRect(pillar.x, pillar.y, pillar.w, pillar.h);
      context.fillStyle = 'rgba(255,215,106,0.5)';
      context.fillRect(pillar.x, pillar.y, pillar.w, 6);
    }
  }

  function drawMangroves() {
    // Mangrove thickets: dark green cover at the water's edge. A boat inside
    // one is hidden from patrols — and from view, which is the point.
    for (let index = 0; index < MANGROVES.length; index += 1) {
      const grove = MANGROVES[index];
      context.fillStyle = PALETTE.mangrove;
      context.beginPath();
      context.ellipse(grove.x + grove.w / 2, grove.y + grove.h / 2, grove.w / 2, grove.h / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.mangroveTop;
      for (let blob = 0; blob < 5; blob += 1) {
        context.beginPath();
        context.arc(grove.x + 14 + blob * 20, grove.y + 16 + (blob % 2) * 26, 12, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawPatrols(state) {
    for (let index = 0; index < state.patrols.length; index += 1) {
      const patrol = state.patrols[index];
      if (!patrol.active) continue;
      const flashing = Math.floor(state.wavePhase * 4) % 2 === 0;
      context.save();
      context.translate(patrol.x + patrol.width / 2, patrol.y + patrol.height / 2);
      context.fillStyle = 'rgba(232,251,255,0.4)';
      context.beginPath();
      context.ellipse(0, patrol.height / 2, 56, 6, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.patrol;
      context.beginPath();
      context.moveTo(-patrol.width / 2 + 4, -8);
      context.lineTo(patrol.width / 2 - 4, -8);
      context.lineTo(patrol.width / 2 - 18, patrol.height / 2 - 4);
      context.lineTo(-patrol.width / 2 + 18, patrol.height / 2 - 4);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.patrolStripe;
      context.fillRect(-patrol.width / 2 + 8, -2, patrol.width - 16, 5);
      context.fillStyle = '#dfe9f5';
      context.fillRect(-16, -20, 32, 14);
      // Flashing beacon: red, then blue.
      context.fillStyle = flashing ? PALETTE.beaconRed : PALETTE.beaconBlue;
      context.beginPath();
      context.arc(0, -24, 7, 0, Math.PI * 2);
      context.fill();
      context.restore();
      text('POLICE', patrol.x + patrol.width / 2, patrol.y - 14, 13, '#e8f4ff', 'center', 'alphabetic');
    }
  }

  function drawHeartShape(x, y, size, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x, y + size * 0.32);
    context.bezierCurveTo(x - size * 0.55, y - size * 0.28, x - size * 0.2, y - size * 0.62, x, y - size * 0.18);
    context.bezierCurveTo(x + size * 0.2, y - size * 0.62, x + size * 0.55, y - size * 0.28, x, y + size * 0.32);
    context.fill();
  }

  function drawItem(item, state) {
    const bob = Math.sin(state.wavePhase * 2 + item.phase) * 3;
    const y = item.y + bob;
    if (item.kind === KIND_LOG) {
      context.fillStyle = PALETTE.log;
      context.fillRect(item.x, y, item.width, item.height);
      context.fillStyle = '#5d3413';
      context.fillRect(item.x, y + item.height - 7, item.width, 7);
      context.strokeStyle = '#a8763e';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(item.x + 14, y + item.height / 2, 8, 0, Math.PI * 2);
      context.stroke();
    } else if (item.kind === KIND_CANOE) {
      context.fillStyle = PALETTE.canoe;
      context.beginPath();
      context.moveTo(item.x, y + 8);
      context.lineTo(item.x + item.width, y + 8);
      context.lineTo(item.x + item.width - 16, y + item.height);
      context.lineTo(item.x + 16, y + item.height);
      context.closePath();
      context.fill();
      // The fisherman, paddling.
      context.fillStyle = '#2e1a3d';
      context.beginPath();
      context.arc(item.x + item.width / 2, y - 2, 9, 0, Math.PI * 2);
      context.fill();
      context.fillRect(item.x + item.width / 2 - 8, y + 4, 16, 10);
      context.strokeStyle = '#e8d9b0';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(item.x + item.width / 2 + 14, y - 10);
      context.lineTo(item.x + item.width / 2 + 34, y + 22);
      context.stroke();
    } else if (item.kind === KIND_DRUM) {
      context.fillStyle = PALETTE.drum;
      context.fillRect(item.x, y, item.width, item.height);
      context.fillStyle = '#8f2a18';
      context.fillRect(item.x, y + 8, item.width, 5);
      context.fillRect(item.x, y + item.height - 13, item.width, 5);
      context.fillStyle = '#ffd76a';
      context.font = 'bold 20px ' + FONT;
      context.textAlign = 'center';
      context.fillText('!', item.x + item.width / 2, y + item.height - 12);
    } else if (item.kind === KIND_BUOY) {
      context.fillStyle = PALETTE.buoy;
      context.beginPath();
      context.arc(item.x + item.width / 2, y + item.height / 2, item.width / 2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff6e8';
      context.fillRect(item.x + 4, y + item.height / 2 - 5, item.width - 8, 10);
      context.fillStyle = '#1a1030';
      context.fillRect(item.x + item.width / 2 - 2, y - 8, 4, 12);
    } else if (item.kind === KIND_SHELL) {
      context.fillStyle = PALETTE.shell;
      context.beginPath();
      context.ellipse(item.x + item.width / 2, y + item.height / 2, 13, 11, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.shellSlit;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(item.x + 6, y + item.height / 2 - 4);
      context.lineTo(item.x + item.width - 6, y + item.height / 2 + 4);
      context.stroke();
      context.fillStyle = 'rgba(255,215,106,0.9)';
      context.beginPath();
      context.arc(item.x + item.width / 2, y + item.height / 2, 17, 0, Math.PI * 2);
      context.stroke();
    } else if (item.kind === KIND_FISH) {
      const wiggle = Math.sin(state.wavePhase * 6 + item.phase) * 3;
      context.fillStyle = PALETTE.fish;
      context.beginPath();
      context.ellipse(item.x + item.width / 2, y + item.height / 2 + wiggle, 17, 10, 0, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(item.x + 2, y + item.height / 2 + wiggle);
      context.lineTo(item.x - 10, y + wiggle);
      context.lineTo(item.x - 10, y + item.height + wiggle);
      context.closePath();
      context.fill();
      context.fillStyle = '#1a1030';
      context.beginPath();
      context.arc(item.x + item.width - 10, y + item.height / 2 + wiggle - 2, 2.5, 0, Math.PI * 2);
      context.fill();
    } else if (item.kind === KIND_CRATE) {
      context.fillStyle = PALETTE.crate;
      context.fillRect(item.x, y, item.width, item.height);
      context.strokeStyle = PALETTE.crateDark;
      context.lineWidth = 3;
      context.strokeRect(item.x + 2, y + 2, item.width - 4, item.height - 4);
      context.beginPath();
      context.moveTo(item.x, y);
      context.lineTo(item.x + item.width, y + item.height);
      context.moveTo(item.x + item.width, y);
      context.lineTo(item.x, y + item.height);
      context.stroke();
      // Glow ring so a job crate reads at a glance.
      context.strokeStyle = 'rgba(255,215,106,0.8)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(item.x + item.width / 2, y + item.height / 2, 24 + Math.sin(state.wavePhase * 4) * 2, 0, Math.PI * 2);
      context.stroke();
    } else if (item.kind === KIND_HEART) {
      drawHeartShape(item.x + item.width / 2, y + item.height / 2 + 4, item.width, PALETTE.heart);
    }
  }

  function drawBoat(state) {
    const boat = state.boat;
    // Blink while invulnerable after a hit: faint, never gone — the player
    // must always see their own boat.
    const blink = boat.invulnerable !== 0 && Math.floor(boat.invulnerable * 10) % 2 === 0 ? 0.35 : 1;
    context.save();
    context.globalAlpha = blink;
    context.translate(boat.x + boat.width / 2, boat.y + boat.height / 2);
    context.rotate(boat.tilt);
    context.translate(-boat.width / 2, -boat.height / 2);
    // Wake foam under the hull.
    context.fillStyle = 'rgba(232,251,255,0.5)';
    context.beginPath();
    context.ellipse(boat.width / 2, boat.height - 2, 52, 7, 0, 0, Math.PI * 2);
    context.fill();
    // Wooden hull.
    context.fillStyle = PALETTE.hull;
    context.beginPath();
    context.moveTo(2, 12);
    context.lineTo(boat.width - 2, 12);
    context.lineTo(boat.width - 14, boat.height - 4);
    context.lineTo(14, boat.height - 4);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.hullDark;
    context.fillRect(8, boat.height - 12, boat.width - 16, 6);
    // Cream canopy and the red flag.
    context.fillStyle = PALETTE.canopy;
    context.beginPath();
    context.moveTo(20, 12);
    context.quadraticCurveTo(boat.width / 2, -12, boat.width - 20, 12);
    context.closePath();
    context.fill();
    context.strokeStyle = '#5f3c1a';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(boat.width / 2, -10);
    context.lineTo(boat.width / 2, -30);
    context.stroke();
    context.fillStyle = PALETTE.flag;
    context.beginPath();
    context.moveTo(boat.width / 2, -30);
    context.lineTo(boat.width / 2 + 22, -24);
    context.lineTo(boat.width / 2, -18);
    context.closePath();
    context.fill();
    // The boatwoman at the tiller.
    context.fillStyle = '#2e1a3d';
    context.beginPath();
    context.arc(boat.width - 26, 2, 8, 0, Math.PI * 2);
    context.fill();
    context.fillRect(boat.width - 34, 6, 16, 10);
    // Cargo on board during a delivery's second leg.
    if (state.mission.active && state.mission.type === 'delivery' && state.mission.phase === 1) {
      context.fillStyle = PALETTE.crate;
      context.fillRect(boat.width / 2 - 14, boat.height - 26, 28, 16);
      context.strokeStyle = PALETTE.crateDark;
      context.lineWidth = 2;
      context.strokeRect(boat.width / 2 - 14, boat.height - 26, 28, 16);
    }
    context.restore();
  }

  function drawParticles(state) {
    context.fillStyle = PALETTE.foam;
    for (let index = 0; index < state.particles.length; index += 1) {
      const particle = state.particles[index];
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life * 2);
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawStrip(line) {
    const width = 640;
    context.fillStyle = 'rgba(22,15,46,0.75)';
    context.fillRect((FIELD.width - width) / 2, 68, width, 30);
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 2;
    context.strokeRect((FIELD.width - width) / 2, 68, width, 30);
    text(line, FIELD.width / 2, 76, 17, PALETTE.text, 'center', 'top');
  }

  function drawHud(state, best, screen) {
    context.textBaseline = 'top';
    // Top bar: score left, Marina progress centre, lives right.
    context.fillStyle = 'rgba(22,15,46,0.55)';
    context.fillRect(0, 0, FIELD.width, 64);
    const seconds = Math.floor(state.elapsed);
    const clock = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    text(scoreLabel(state.score), 24, 12, 28, PALETTE.text, 'left', 'top');
    text(levelLabel(state.level) + '  ·  ' + clock + '  ·  ' + Math.round(state.speed) + ' kn', 24, 42, 16, PALETTE.muted, 'left', 'top');
    const barX = 430;
    const barWidth = 420;
    text('EKO MARINA', barX + barWidth / 2, 8, 15, PALETTE.accent, 'center', 'top');
    context.fillStyle = '#0a2e3d';
    context.fillRect(barX, 28, barWidth, 14);
    context.fillStyle = PALETTE.accent;
    context.fillRect(barX, 28, barWidth * Math.min(1, state.cowries / WIN_SHELLS), 14);
    text(state.cowries + ' / ' + WIN_SHELLS + ' cowries', barX + barWidth / 2, 46, 14, PALETTE.text, 'center', 'top');
    // Wanted stars, between the Marina bar and the lives.
    const starLabel = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    text(starLabel, 880, 8, 22, state.wanted > 0 ? '#ffb020' : '#5a4a72', 'left', 'top');
    text('WANTED', 880, 40, 12, PALETTE.muted, 'left', 'top');
    const firstHeart = FIELD.width - 24 - LIVES * (HEART_SIZE + HEART_GAP) + HEART_GAP;
    text('Lives', firstHeart - 14, 12, 28, PALETTE.text, 'right', 'top');
    for (let life = 0; life < LIVES; life += 1) {
      drawHeartShape(firstHeart + life * (HEART_SIZE + HEART_GAP) + HEART_SIZE / 2, 52, HEART_SIZE, life < state.lives ? PALETTE.heart : '#3a2a4d');
    }
    if (screen === SCREEN_PLAY) {
      const mission = state.mission;
      if (mission.active) {
        const left = Math.max(0, Math.ceil(mission.timer));
        const mclock = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        const objective = mission.type === 'delivery'
          ? (mission.phase === 0 ? 'JOB: Pick up the cargo at the west dock' : 'JOB: Deliver the cargo to Eko Marina')
          : 'JOB: Collect the crates  ' + mission.got + '/' + mission.need;
        drawStrip(objective + '    ' + mclock);
      } else if (mission.offered) {
        const job = mission.type === 'delivery' ? 'Deliver cargo to Eko Marina  (+150)' : 'Collect 5 crates  (+120)';
        drawStrip('NEW JOB — ' + job + '   — press E');
      }
      if (state.speeding && Math.floor(state.wavePhase * 6) % 2 === 0) {
        text('SLOW DOWN — NO WAKE ZONE', FIELD.width / 2, 104, 20, PALETTE.zone, 'center', 'top');
      }
    }
    if (state.bannerTimer > 0) {
      context.globalAlpha = Math.min(1, state.bannerTimer);
      text(state.banner, FIELD.width / 2, 180, 40, PALETTE.accent, 'center', 'top');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, PALETTE.accent, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.text, 'center');
  }

  const TITLE_LINES = ['GTA-style lagoon: momentum, drift, wanted stars.', 'Marine patrols chase you when the heat is on.', 'Take jobs: deliveries and crate runs pay big.', 'Catch 30 cowrie shells to reach Eko Marina.', 'Move with arrows or WASD, or hold the mouse.', 'E takes a job. P pauses, M mutes.', ''];
  const PAUSED_LINES = ['The lagoon will wait for you.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['You reached Eko Marina with the evening catch!', '', ''];

  /** Paint one frame: sky, water, items, boat, particles, then the HUD or a panel. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state);
    drawWater(state);
    drawZones(state);
    drawPillars();
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (item.active) drawItem(item, state);
    }
    drawBoat(state);
    drawPatrols(state);
    drawMangroves();
    drawParticles(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[6] = bestLabel(best);
      drawPanel('LAGOON RUSH', TITLE_LINES, 'Press Space or click to set sail');
      return;
    }
    drawHud(state, best, screen);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to keep sailing');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score) + '  ·  ' + state.cowries + ' cowries';
      OVER_LINES[1] = bestLabel(best);
      drawPanel('The lagoon wins', OVER_LINES, 'Press Space or click to sail again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[1] = finalLabel(state.score) + '  ·  ' + state.cowries + ' cowries';
      WIN_LINES[2] = bestLabel(best);
      drawPanel('EKO MARINA!', WIN_LINES, 'Press Space or click to sail again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
