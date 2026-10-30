export const THEME_CATEGORIES = [
  ['catppuccin', 'Catppuccin'],
  ['rose-pine', 'Rosé Pine'],
  ['earthbound', 'EarthBound'],
  ['retro', 'Retro & Analog'],
  ['nature', 'Nature & Earth'],
  ['atmospheric', 'Dreamy & Atmospheric'],
  ['technical', 'Technical & Industrial'],
  ['color', 'Color & Gemstones'],
  ['playful', 'Soft & Playful'],
  ['modern', 'Modern & Minimal'],
  ['classic', 'Editor Classics'],
  ['uncategorized', 'Uncategorized'],
].map(([id, label]) => ({ id, label }));

const CATEGORY_PATTERNS = [
  ['catppuccin', /^Catppuccin/],
  ['rose-pine', /^RosePine/],
  ['earthbound', /^(CaveOfThePast|DevilsMachine|DustyDunes|EarthBound|FireSpring|Magicant|Moonside|ZombieThreed)(?:-|$)/],
  ['retro', /^(90sAnime|ScreenBurnMonitor|SailorMoonBackground|SpiritedAway|Synthwave84|EtherealWindows7|EtherealY2KAero|SLSO8Pixels|Soapy10|Matrix|HatsuneMiku|MikuBetter|PastelPixels)/],
  ['nature', /^(AdaptaEvergreen|OminousOlives|Silkpukian24|Vanitas|Everforest|Kanagawa|OsakaJade|Gruvbox|matchalk|LoFiGreenDark|Seafoam|Zenburn|Flexoki)/],
  ['atmospheric', /^(Aura|BerryNebula|DarkHorizon|DarkMagic|Ethereal|Hydrangea11|Fairyfloss|FluffyDark|Fogfire|InkCrimson)/],
  ['technical', /^(Carbonfox|Cyclope6|NOPAL12|OC2|KickDark|Mercury|Cobalt2|Vesper|OpenCode)/],
  ['playful', /^(Kawaii|PumpkinBrew|Macaroon|ShadesofPurple|ModernPurple)/],
  ['modern', /^(AMOLED|Claude|Cursor|GitHub|Material|TwitchDark|Vercel|YouTubeDark|Orng|LucentOrng)/],
  ['classic', /^(Ayu|Dracula|EvondevDracula|Monokai|NightOwl|Nord|OneDark|Palenight|Solarized|Tokyonight)/],
];

export function getThemeCategory(file) {
  const name = file.replace(/^Colorway-/, '').replace(/\.ovt$/, '');
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(name))?.[0] ?? 'uncategorized';
}

export function filterThemeCatalog(themes, { category = 'all', query = '' } = {}) {
  const term = query.trim().toLocaleLowerCase();
  return themes.filter((theme) =>
    (category === 'all' || getThemeCategory(theme.file) === category)
    && (!term || theme.name.toLocaleLowerCase().includes(term)));
}

export function sortThemesByDisplayName(themes, themeData = {}) {
  return [...themes].sort((a, b) =>
    (themeData[a.file]?.name || a.name).localeCompare(themeData[b.file]?.name || b.name));
}

const SOURCE_PRESETS = [
  ['aether_nebula_flow', 'Aether Nebula Flow', 'atmospheric', true],
  ['amber', 'Amber', 'color', false],
  ['amber_command_1979', 'Amber Command 1979', 'retro', true],
  ['amethyst', 'Amethyst', 'color', false],
  ['apollo_analogue_futurism', 'Apollo Analogue Futurism', 'retro', true],
  ['astral_projection', 'Astral Projection', 'atmospheric', true],
  ['bio_digital_synthesis', 'Bio-Digital Synthesis', 'technical', true],
  ['bioluminescence', 'Bioluminescence', 'nature', true],
  ['blue_lightning', 'Blue Lightning', 'atmospheric', true],
  ['emerald', 'Emerald', 'color', false],
  ['entropy_data_storm', 'Entropy Data-Storm', 'technical', true],
  ['four_seasons_desynced', 'Four Seasons Desynced', 'nature', true],
  ['kinetic_thermal_plasma_core', 'Kinetic Thermal Plasma Core', 'technical', true],
  ['koi_pond', 'Koi Pond', 'nature', true],
  ['lumina_aurora', 'Lumina Aurora', 'atmospheric', true],
  ['matrix_rain', 'Matrix Rain', 'retro', true],
  ['midnight', 'Midnight', 'color', false],
  ['midsummer', 'Midsummer', 'nature', true],
];
const MORE_PRESETS = [
  ['neo_tactical_archive_01', 'Neo-Tactical Archive 01', 'technical', true],
  ['neon_overdrive', 'Neon Overdrive', 'playful', true],
  ['obsidian', 'Obsidian', 'color', false],
  ['pink_hues', 'Pink Hues', 'playful', true],
  ['project_singularity', 'Project Singularity', 'atmospheric', true],
  ['retro_terminal_crt', 'Retro Terminal CRT', 'retro', true],
  ['rose_pine', 'Rosé Pine', 'rose-pine', true],
  ['ruby', 'Ruby', 'color', false],
  ['sapphire', 'Sapphire', 'color', false],
  ['solar_flare', 'Solar Flare', 'atmospheric', true],
  ['sovereign', 'Sovereign', 'modern', true],
  ['synthwave_1984', 'Synthwave 1984', 'retro', true],
  ['the_cyanotype', 'The Cyanotype', 'technical', true],
  ['topaz', 'Topaz', 'color', false],
  ['toxic_nebula_smog_core', 'Toxic Nebula Smog-Core', 'atmospheric', true],
  ['wasteland_uplink_amber', 'Wasteland Uplink Amber', 'retro', true],
  ['windows_hotdog_stand', 'Windows Hotdog Stand', 'retro', true],
];
export const UPSTREAM_THEME_PRESETS = [...SOURCE_PRESETS, ...MORE_PRESETS]
  .map(([slug, name, category, effectRich]) => ({
    file: slug + '.json', name, category, effectRich,
    url: 'https://raw.githubusercontent.com/silentoplayz/theme-designer-pro-presets/main/themes/' + slug + '.json',
    status: 'source-only',
  }));
