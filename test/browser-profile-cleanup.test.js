import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanupBrowserProfile } from '../scripts/browser-profile-cleanup.mjs';

test('cleanup waits for the child browser exit before deleting its profile', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'colorway-cleanup-test-'));
  writeFileSync(join(profile, 'DevToolsActivePort'), '4444');
  const browser = new EventEmitter();
  browser.exitCode = null;
  browser.signalCode = null;
  let shutdownRequested = false;
  browser.kill = (signal) => {
    assert.equal(signal, 'SIGTERM');
    shutdownRequested = true;
    setImmediate(() => {
      browser.exitCode = 0;
      browser.emit('exit', 0, null);
    });
    return true;
  };
  try {
    await cleanupBrowserProfile(browser, profile, {
      remove(path, options) {
        assert.equal(path, profile);
        assert.equal(browser.exitCode, 0, 'profile removed before browser exit');
        rmSync(path, options);
      },
    });
    assert.equal(shutdownRequested, true);
    assert.equal(existsSync(profile), false);
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
});

test('cleanup retries a transient ENOTEMPTY race without suppressing other errors', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'colorway-retry-test-'));
  const browser = { exitCode: 0, signalCode: null, kill() { throw Error('already exited'); } };
  let attempts = 0;
  try {
    await cleanupBrowserProfile(browser, profile, {
      remove(path, options) {
        attempts++;
        if (attempts < 3) throw Object.assign(new Error('browser finishing profile write'), { code: 'ENOTEMPTY' });
        rmSync(path, options);
      },
    });
    assert.equal(attempts, 3);
    assert.equal(existsSync(profile), false);
    await assert.rejects(
      cleanupBrowserProfile(browser, profile, {
        remove() { throw Object.assign(new Error('access denied'), { code: 'EACCES' }); },
      }),
      { code: 'EACCES' },
    );
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
});

test('cleanup does not leave a two-second timer keeping Node alive after Chrome exits', () => {
  const program = `
    import { EventEmitter } from 'node:events';
    import { cleanupBrowserProfile } from './scripts/browser-profile-cleanup.mjs';
    const browser = new EventEmitter();
    browser.exitCode = null;
    browser.signalCode = null;
    browser.kill = () => {
      setImmediate(() => { browser.exitCode = 0; browser.emit('exit', 0, null); });
      return true;
    };
    await cleanupBrowserProfile(browser, '/tmp/nonexistent-colorway-profile-test');
    console.log('clean');
  `;
  const started = Date.now();
  const outcome = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
    cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', timeout: 4000,
  });
  assert.equal(outcome.status, 0, outcome.stderr);
  assert.match(outcome.stdout, /clean/);
  assert.ok(Date.now() - started < 1500, 'Chromium exit must clear its pending timeout');
});
