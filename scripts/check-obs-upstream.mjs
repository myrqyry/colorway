import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASELINE_FILE = fileURLToPath(new URL('./obs-upstream-baseline.json', import.meta.url));

function normalizeHeader(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function extractThemeVars(text) {
  const match = text.match(/@OBSThemeVars\s*\{([\s\S]*?)\n\}/);
  if (!match) return new Set();
  return new Set(
    [...match[1].matchAll(/^\s*(--[A-Za-z0-9_]+)\s*:/gm)].map((entry) => entry[1]),
  );
}

export function extractQssSelectors(text) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutObsBlocks = withoutComments
    .replace(/@OBSThemeMeta\s*\{[\s\S]*?\}/g, '')
    .replace(/@OBSThemeVars\s*\{[\s\S]*?\n\}/g, '');

  const selectors = new Set();
  for (const match of withoutObsBlocks.matchAll(/(^|\})\s*([^{}]+?)\s*\{/gm)) {
    const header = normalizeHeader(match[2]);
    if (!header || header.startsWith('@')) continue;
    for (const selector of header.split(',')) {
      const normalized = normalizeHeader(selector);
      if (normalized) selectors.add(normalized);
    }
  }
  return selectors;
}

export function extractParserTokens(text) {
  return new Set(
    [...text.matchAll(/cf_token_is\(cfp,\s*"([^"]+)"\)/g)].map((entry) => entry[1]),
  );
}

export function setDelta(before, after) {
  return {
    added: [...after].filter((value) => !before.has(value)).sort(),
    removed: [...before].filter((value) => !after.has(value)).sort(),
  };
}

function formatValues(values, empty = 'none') {
  if (!values.length) return empty;
  return values.map((value) => `- \`${value}\``).join('\n');
}

function authHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'colorway-obs-upstream-watch',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.text();
}

function rawUrl(repository, sha, path) {
  return `https://raw.githubusercontent.com/${repository}/${sha}/${path}`;
}

async function latestCommit(repository, path) {
  const url = new URL(`https://api.github.com/repos/${repository}/commits`);
  url.searchParams.set('path', path);
  url.searchParams.set('per_page', '1');
  const commits = await fetchJson(url);
  if (!Array.isArray(commits) || !commits.length) {
    throw new Error(`no upstream commits returned for ${path}`);
  }
  return commits[0];
}

async function describeThemeChange(repository, source, latest) {
  const [beforeText, afterText] = await Promise.all([
    fetchText(rawUrl(repository, source.commit, source.path)),
    fetchText(rawUrl(repository, latest.sha, source.path)),
  ]);

  const vars = setDelta(extractThemeVars(beforeText), extractThemeVars(afterText));
  const selectors = setDelta(extractQssSelectors(beforeText), extractQssSelectors(afterText));

  return [
    '#### Theme variables',
    '**Added**',
    formatValues(vars.added),
    '',
    '**Removed**',
    formatValues(vars.removed),
    '',
    '#### QSS selectors',
    '**Added**',
    formatValues(selectors.added),
    '',
    '**Removed**',
    formatValues(selectors.removed),
  ].join('\n');
}

async function describeParserChange(repository, source, latest) {
  const [beforeText, afterText] = await Promise.all([
    fetchText(rawUrl(repository, source.commit, source.path)),
    fetchText(rawUrl(repository, latest.sha, source.path)),
  ]);
  const tokens = setDelta(extractParserTokens(beforeText), extractParserTokens(afterText));
  return [
    '#### Parser tokens recognized through `cf_token_is`',
    '**Added**',
    formatValues(tokens.added),
    '',
    '**Removed**',
    formatValues(tokens.removed),
  ].join('\n');
}

function commitTitle(commit) {
  return commit.commit?.message?.split('\n')[0] || '(no commit message)';
}

export async function checkUpstream(baseline) {
  const report = [
    '# OBS upstream theme watch',
    '',
    `Reviewed baseline: ${baseline.reviewed_at}`,
    `Repository: \`${baseline.repository}\``,
    '',
  ];
  let changed = false;

  for (const source of baseline.sources) {
    const latest = await latestCommit(baseline.repository, source.path);
    const same = latest.sha === source.commit;

    report.push(`## ${source.label}`);
    report.push(`Path: \`${source.path}\``);
    report.push(`Reviewed: \`${source.commit}\``);
    report.push(`Latest:   \`${latest.sha}\``);
    report.push(`Latest commit: ${commitTitle(latest)}`);
    report.push(`Commit URL: ${latest.html_url}`);
    report.push('');

    if (same) {
      report.push('Status: **unchanged since the reviewed baseline**');
      report.push('');
      continue;
    }

    changed = true;
    report.push('Status: **UPSTREAM CHANGED — review required**');
    report.push('');

    if (source.kind === 'theme') {
      report.push(await describeThemeChange(baseline.repository, source, latest));
    } else if (source.kind === 'parser') {
      report.push(await describeParserChange(baseline.repository, source, latest));
    }
    report.push('');
  }

  return { changed, markdown: report.join('\n') };
}

async function main() {
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
  const { changed, markdown } = await checkUpstream(baseline);

  console.log(markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }

  if (changed) {
    console.error(
      '\nOBS theme upstream moved. Review the reported delta before updating scripts/obs-upstream-baseline.json.',
    );
    process.exitCode = 1;
  }
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error('OBS upstream check failed:', error);
    process.exitCode = 2;
  });
}
