// A browser may keep writing DevTools/profile files briefly after SIGTERM.
// Do not race filesystem cleanup against child-process shutdown.
import { rmSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

export async function cleanupBrowserProfile(browser, profile, { remove = rmSync } = {}) {
  if (browser && browser.exitCode == null && browser.signalCode == null) {
    const exited = new Promise((resolve) => {
      browser.once('exit', resolve);
      browser.once('error', resolve);
    });
    browser.kill('SIGTERM');
    // Bound the wait, and clear its timer when Chromium exits promptly.
    let timeout;
    try {
      await Promise.race([exited, new Promise((resolve) => {
        timeout = setTimeout(resolve, 2000);
      })]);
    } finally {
      clearTimeout(timeout);
    }
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      remove(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 60 });
      return;
    } catch (error) {
      if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error?.code) || attempt === 7) throw error;
      await delay(60 * (attempt + 1));
    }
  }
}
