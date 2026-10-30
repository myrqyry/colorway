// User activity is an explicit stop signal for the automatic palette slideshow.
// Programmatic events (such as the change emitted when shuffling patterns)
// must not cause the slideshow to stop itself.
const ACTIVITY_EVENTS = [
  'pointermove', 'pointerdown', 'wheel', 'keydown',
  'beforeinput', 'input', 'change',
];

export function installShuffleActivityPause(target, pause, { ignore = () => false } = {}) {
  let stoppedByActivity = false;

  const onActivity = (event) => {
    if (!event.isTrusted || stoppedByActivity || ignore(event)) return;
    stoppedByActivity = true;
    pause();
  };

  for (const type of ACTIVITY_EVENTS) {
    target.addEventListener(type, onActivity, { capture: true, passive: true });
  }

  return {
    resume() {
      stoppedByActivity = false;
    },
    dispose() {
      for (const type of ACTIVITY_EVENTS) {
        target.removeEventListener(type, onActivity, true);
      }
    },
  };
}
