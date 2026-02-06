/**
 * moodToCSS — Maps the MoodVector to CSS custom properties.
 *
 * Any template can read these variables to adapt its appearance
 * to the current ambient context without importing anything.
 *
 * Variables set:
 *   --mood-energy, --mood-warmth, --mood-urgency, --mood-density,
 *   --mood-tempo, --mood-brightness, --mood-formality
 *   --mood-bg           HSL background colour
 *   --mood-accent        HSL accent colour
 *   --mood-text          Foreground text colour
 *   --mood-anim-speed    Base animation duration (seconds)
 *   --mood-hue           Computed hue (210 cool → 30 warm)
 *   --mood-saturation    Computed saturation %
 *   --mood-lightness     Computed lightness %
 */

import type { MoodVector } from '../hooks/useContextMood';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Apply mood vector to the document's CSS custom properties.
 * Call this on every mood update (e.g. inside useEffect).
 */
export function applyMoodToCSS(mood: MoodVector): void {
  const root = document.documentElement.style;

  // Raw mood values (templates can use these directly)
  root.setProperty('--mood-energy', String(mood.energy));
  root.setProperty('--mood-warmth', String(mood.warmth));
  root.setProperty('--mood-urgency', String(mood.urgency));
  root.setProperty('--mood-density', String(mood.density));
  root.setProperty('--mood-tempo', String(mood.tempo));
  root.setProperty('--mood-brightness', String(mood.brightness));
  root.setProperty('--mood-formality', String(mood.formality));

  // Derived colour: hue shifts from cool blue (210) to warm amber (30)
  const hue = lerp(210, 30, mood.warmth);
  const saturation = clamp(lerp(30, 80, mood.energy), 0, 100);
  const lightness = clamp(lerp(8, 45, mood.brightness), 0, 100);

  root.setProperty('--mood-hue', String(Math.round(hue)));
  root.setProperty('--mood-saturation', `${Math.round(saturation)}%`);
  root.setProperty('--mood-lightness', `${Math.round(lightness)}%`);

  // Background colour
  root.setProperty(
    '--mood-bg',
    `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`
  );

  // Accent colour — shifted hue, brighter
  const accentHue = hue + 30;
  const accentSat = clamp(saturation + 10, 0, 100);
  const accentLight = clamp(lightness + 20, 0, 100);
  root.setProperty(
    '--mood-accent',
    `hsl(${Math.round(accentHue)}, ${Math.round(accentSat)}%, ${Math.round(accentLight)}%)`
  );

  // Text colour — light on dark, dark on light
  const textLightness = lightness > 50 ? 10 : 95;
  root.setProperty('--mood-text', `hsl(${Math.round(hue)}, 10%, ${textLightness}%)`);

  // Urgency overlay — only visible when urgency is elevated
  if (mood.urgency > 0.3) {
    const urgencyAlpha = clamp(lerp(0, 0.3, (mood.urgency - 0.3) / 0.7), 0, 1);
    root.setProperty('--mood-urgency-overlay', `rgba(255, 40, 40, ${urgencyAlpha.toFixed(3)})`);
  } else {
    root.setProperty('--mood-urgency-overlay', 'rgba(255, 40, 40, 0)');
  }

  // Animation speed: high tempo = fast (1s), low tempo = slow (8s)
  const animDuration = lerp(8, 1, mood.tempo);
  root.setProperty('--mood-anim-speed', `${animDuration.toFixed(2)}s`);

  // Pulse rate for breathing/pulsing animations
  const pulseRate = lerp(4, 0.5, mood.tempo);
  root.setProperty('--mood-pulse-rate', `${pulseRate.toFixed(2)}s`);

  // Density affects spacing/padding scale (1 = dense, 2 = sparse)
  const spacingScale = lerp(2, 0.8, mood.density);
  root.setProperty('--mood-spacing-scale', String(spacingScale.toFixed(2)));
}

/**
 * Remove all mood CSS custom properties (cleanup).
 */
export function clearMoodCSS(): void {
  const root = document.documentElement.style;
  const props = [
    '--mood-energy', '--mood-warmth', '--mood-urgency', '--mood-density',
    '--mood-tempo', '--mood-brightness', '--mood-formality',
    '--mood-bg', '--mood-accent', '--mood-text',
    '--mood-urgency-overlay', '--mood-anim-speed', '--mood-pulse-rate',
    '--mood-spacing-scale', '--mood-hue', '--mood-saturation', '--mood-lightness',
  ];
  for (const p of props) {
    root.removeProperty(p);
  }
}
