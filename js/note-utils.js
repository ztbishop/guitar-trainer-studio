// note-utils.js
// Owns: note-name helpers and display formatting
// Do NOT: put MIDI device logic here

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_LABELS = ['1 (high E)', '2 (B)', '3 (G)', '4 (D)', '5 (A)', '6 (low E)'];

export function midiToNoteName(midi) {
  if (!Number.isFinite(midi)) return 'Unknown';
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function channelToStringHint(channel, baseChannel = 1, reverse = false) {
  if (!Number.isInteger(channel) || !Number.isInteger(baseChannel) || channel < 1 || channel > 16 ||
      baseChannel < (reverse ? 6 : 1) || baseChannel > (reverse ? 16 : 11)) return null;
  const offset = reverse ? baseChannel - channel : channel - baseChannel;
  if (offset < 0 || offset > 5) return null;
  return 6 - offset;
}

export function formatStringHint(stringHint) {
  if (!Number.isFinite(stringHint)) return 'Unknown string';
  const index = stringHint - 1;
  return STRING_LABELS[index] || `String ${stringHint}`;
}
