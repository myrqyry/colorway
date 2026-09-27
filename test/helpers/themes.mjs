import { readdirSync, readFileSync } from 'node:fs';

import { parseOVT } from '../../src/theme-loader.js';

export const THEMES_DIR = new URL('../../themes/', import.meta.url);

export const themeFiles = () =>
  readdirSync(THEMES_DIR)
    .filter((file) => file.endsWith('.ovt'))
    .sort();

export const readTheme = (file) => readFileSync(new URL(file, THEMES_DIR), 'utf8');

export const isLightTheme = (source) => parseOVT(source).meta._dark === false;
