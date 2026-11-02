import test from 'node:test';
import assert from 'node:assert/strict';
import { installShuffleActivityPause } from '../src/shuffle-activity.js';

function interactionTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    dispatch(type, trusted = true, target = {}) {
      for (const listener of listeners.get(type) || []) listener({ type, isTrusted: trusted, target });
    },
  };
}

test('movement, hover, scrolling, focusing and non-changing gestures keep cycling', () => {
  const page = interactionTarget();
  let pauses = 0;
  const control = installShuffleActivityPause(page, () => { pauses += 1; });
  for (const type of ['pointermove', 'pointerdown', 'wheel', 'keydown', 'focusin']) page.dispatch(type);
  assert.equal(pauses, 0);
  control.dispose();
});

test('actual choices and edits stop the slideshow', () => {
  for (const type of ['click', 'beforeinput', 'input', 'change']) {
    const page = interactionTarget();
    let paused = false;
    installShuffleActivityPause(page, () => { paused = true; });
    page.dispatch(type, true, { closest: () => type === 'click' ? {} : null });
    assert.equal(paused, true, type);
  }
});

test('clicking inert surfaces does not stop the slideshow', () => {
  const page = interactionTarget();
  let pauses = 0;
  installShuffleActivityPause(page, () => { pauses += 1; });
  page.dispatch('click', true, { closest: () => null });
  assert.equal(pauses, 0);
});

test('synthetic app changes do not stop the automatic slideshow', () => {
  const page = interactionTarget();
  let pauses = 0;
  installShuffleActivityPause(page, () => { pauses += 1; });
  // Changing the random pattern dispatches an untrusted change event.
  page.dispatch('change', false);
  page.dispatch('input', false);
  page.dispatch('pointermove', false);
  assert.equal(pauses, 0);
});

test('Play and Pause controls do not cancel their own user action', () => {
  const page = interactionTarget();
  let pauses = 0;
  const control = installShuffleActivityPause(page, () => { pauses += 1; }, {
    ignore: (event) => event.target?.pauseControl === true,
  });
  page.dispatch('click', true, { pauseControl: true, closest: () => ({}) });
  assert.equal(pauses, 0);
  page.dispatch('click', true, { closest: () => ({}) });
  assert.equal(pauses, 1);
  control.dispose();
});

test('after explicit resume, the next real interaction stops it again', () => {
  const page = interactionTarget();
  let pauses = 0;
  const control = installShuffleActivityPause(page, () => { pauses += 1; });
  page.dispatch('change');
  assert.equal(pauses, 1);
  control.resume();
  page.dispatch('change');
  assert.equal(pauses, 2);
  control.dispose();
});
