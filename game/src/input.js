// Keyboard and mouse, read as a direction and as one-shot actions. The boat
// follows the pointer while it is held, and the arrow keys or WASD steer it
// the moment they are pressed. Space, Enter or a click confirms; P pauses; M mutes.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_MISSION = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let pointer = null;
  let pointerDown = false;

  function keyOf(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyOf(event);
    if (key === ' ' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'Enter') actions |= ACTION_CONFIRM;
    else if (key === 'p' || key === 'P' || key === 'Escape') actions |= ACTION_PAUSE;
    else if (key === 'm' || key === 'M') actions |= ACTION_MUTE;
    else if (key === 'e' || key === 'E') actions |= ACTION_MISSION;
  });
  window.addEventListener('keyup', (event) => keys.delete(keyOf(event)));
  window.addEventListener('blur', () => keys.clear());

  function pointFrom(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    pointer = pointFrom(event);
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pointerDown) pointer = pointFrom(event);
  });
  window.addEventListener('pointerup', () => { pointerDown = false; });

  /** The steering direction this frame: -1, 0 or 1 on each axis, plus the pointer target. */
  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) x += 1;
    if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) y += 1;
    return { x, y, pointer: pointerDown ? pointer : null };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  return { direction, takeActions };
}
