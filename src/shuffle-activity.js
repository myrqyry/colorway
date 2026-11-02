// User activity is an explicit stop signal for the automatic palette slideshow.
// Programmatic events (such as the change emitted when shuffling patterns)
// must not cause the slideshow to stop itself.
const ACTIVITY_EVENTS = ['click', 'beforeinput', 'input', 'change'];
const ACTIONABLE_SELECTOR = 'button, a[href], select, option, input, textarea, label, summary, [role="button"], [role="option"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="radio"]';

export function installShuffleActivityPause(target, pause, { ignore = () => false } = {}) {
  let stoppedByActivity = false;

  const onActivity = (event) => {
    if (!event.isTrusted || stoppedByActivity || ignore(event)) return;
    if (event.type === 'click' && !event.target?.closest?.(ACTIONABLE_SELECTOR)) return;
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
