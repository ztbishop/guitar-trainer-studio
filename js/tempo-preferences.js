export const METRONOME_VOLUME_KEY = 'gts.metronomeVolumePercent';
export const DEFAULT_METRONOME_VOLUME = 75;

export function readMetronomeVolume(storage) {
  try {
    storage ??= globalThis.window?.localStorage;
    const value = storage?.getItem(METRONOME_VOLUME_KEY);
    const number = value === null || value === undefined || value.trim() === '' ? NaN : Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? number : DEFAULT_METRONOME_VOLUME;
  } catch { return DEFAULT_METRONOME_VOLUME; }
}

export function saveMetronomeVolume(value) {
  try { globalThis.window?.localStorage?.setItem(METRONOME_VOLUME_KEY, String(value)); }
  catch { /* The current session remains usable when storage is blocked. */ }
}
