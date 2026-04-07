// midi-router.js
// Owns: MIDI device setup and normalized note events
// Do NOT: decide correctness here

import { AppState } from './app-state.js';
import { channelToStringHint, midiToNoteName } from './note-utils.js';

let midiAccess = null;
let activeInput = null;
let activeListener = null;
let callbacks = {
  onMidiEvent: null,
  onStateChange: null,
};

function getActiveNoteKey(channel, midi) {
  return `${channel}:${midi}`;
}

function addActiveNote(normalized) {
  if (!Number.isFinite(normalized?.channel) || !Number.isFinite(normalized?.midi)) return;
  const key = getActiveNoteKey(normalized.channel, normalized.midi);
  AppState.midi.activeNotes.set(key, normalized);

  if (!AppState.midi.activeNotesByChannel.has(normalized.channel)) {
    AppState.midi.activeNotesByChannel.set(normalized.channel, new Set());
  }
  AppState.midi.activeNotesByChannel.get(normalized.channel).add(normalized.midi);
}

function removeActiveNote(normalized) {
  if (!Number.isFinite(normalized?.channel) || !Number.isFinite(normalized?.midi)) return;
  const key = getActiveNoteKey(normalized.channel, normalized.midi);
  AppState.midi.activeNotes.delete(key);

  const channelSet = AppState.midi.activeNotesByChannel.get(normalized.channel);
  if (!channelSet) return;
  channelSet.delete(normalized.midi);
  if (!channelSet.size) {
    AppState.midi.activeNotesByChannel.delete(normalized.channel);
  }
}

function updateStateChange() {
  callbacks.onStateChange?.({ ...AppState.midi });
}

function getInputs() {
  if (!midiAccess) return [];
  return Array.from(midiAccess.inputs.values()).map((input) => ({
    id: input.id,
    name: input.name || 'Unknown MIDI input',
    manufacturer: input.manufacturer || '',
  }));
}

function isEventInSelectedChannelRange(event) {
  if (AppState.inputMode === 'single-channel') {
    if (AppState.midi.singleChannel === 'any') {
      return true;
    }
    return Number(AppState.midi.singleChannel) === event.channel;
  }

  const base = Number(AppState.midi.hexChannelBase || 1);
  return event.channel >= base && event.channel <= base + 5;
}

function setActiveInput(input) {
  if (activeInput && activeListener) {
    activeInput.removeEventListener('midimessage', activeListener);
  }

  activeInput = input || null;
  AppState.midi.activeInputId = input?.id || '';
  AppState.midi.activeNotes.clear();
  AppState.midi.activeNotesByChannel.clear();

  if (activeInput) {
    activeListener = (message) => {
      const normalized = normalizeMidiMessage(message, {
        inputMode: AppState.inputMode,
        hexChannelBase: AppState.midi.hexChannelBase,
      });

      if (!normalized) return;
      if (!isEventInSelectedChannelRange(normalized)) return;

      if (normalized.type === 'note-on') {
        addActiveNote(normalized);
      } else if (normalized.type === 'note-off') {
        removeActiveNote(normalized);
      }

      AppState.midi.lastEvent = normalized;
      AppState.midi.recentEvents = [normalized, ...AppState.midi.recentEvents].slice(0, 8);
      AppState.ui.midiStatus = `Receiving from ${activeInput.name || 'MIDI input'}`;
      updateStateChange();
      callbacks.onMidiEvent?.(normalized);
    };

    activeInput.addEventListener('midimessage', activeListener);
    AppState.ui.midiStatus = `Listening: ${activeInput.name || 'MIDI input'}`;
  } else {
    activeListener = null;
    AppState.ui.midiStatus = AppState.midi.supported ? 'No MIDI input selected' : 'Web MIDI unavailable';
  }

  updateStateChange();
}

function refreshInputs() {
  AppState.midi.availableInputs = getInputs();

  if (!AppState.midi.availableInputs.length) {
    setActiveInput(null);
    AppState.ui.midiStatus = AppState.midi.supported ? 'No MIDI inputs found' : 'Web MIDI unavailable';
    updateStateChange();
    return;
  }

  const desiredId = AppState.midi.activeInputId || AppState.midi.availableInputs[0].id;
  const input = midiAccess.inputs.get(desiredId) || midiAccess.inputs.get(AppState.midi.availableInputs[0].id);
  setActiveInput(input || null);
}

export async function initMidiRouter({ onMidiEvent, onStateChange } = {}) {
  callbacks.onMidiEvent = onMidiEvent || null;
  callbacks.onStateChange = onStateChange || null;
  AppState.midi.accessRequested = true;

  if (!navigator.requestMIDIAccess) {
    AppState.midi.supported = false;
    AppState.ui.midiStatus = 'Web MIDI is not supported in this browser';
    updateStateChange();
    return null;
  }

  try {
    midiAccess = await navigator.requestMIDIAccess();
    AppState.midi.supported = true;
    midiAccess.onstatechange = () => {
      refreshInputs();
    };
    refreshInputs();
    return midiAccess;
  } catch (error) {
    console.error('Could not get MIDI access.', error);
    AppState.midi.supported = false;
    AppState.ui.midiStatus = 'Could not access MIDI devices';
    updateStateChange();
    return null;
  }
}

export function setActiveMidiInput(inputId) {
  if (!midiAccess) return false;
  const input = midiAccess.inputs.get(inputId);
  if (!input) return false;
  setActiveInput(input);
  return true;
}

export function normalizeMidiMessage(message, config = {}) {
  const data = Array.from(message?.data || []);
  if (data.length < 1) return null;

  const [status, midi, velocity = 0] = data;
  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  const inputMode = config.inputMode || 'single-channel';
  const common = {
    channel,
    midi: Number.isFinite(midi) ? midi : null,
    velocity: Number.isFinite(velocity) ? velocity : null,
    noteName: Number.isFinite(midi) ? midiToNoteName(midi) : null,
    stringHint: inputMode === 'hex-6ch' ? channelToStringHint(channel, config.hexChannelBase ?? 1) : null,
    inputMode,
    raw: data,
    at: performance.now(),
  };

  if (command === 0x90 && Number.isFinite(midi) && velocity > 0) {
    return {
      ...common,
      type: 'note-on',
      typeLabel: 'Note on',
    };
  }

  if ((command === 0x80 || command === 0x90) && Number.isFinite(midi)) {
    return {
      ...common,
      type: 'note-off',
      typeLabel: 'Note off',
    };
  }

  if (command === 0xe0) {
    return {
      ...common,
      type: 'pitch-bend',
      typeLabel: 'Pitch bend',
      midi: null,
      noteName: null,
      stringHint: inputMode === 'hex-6ch' ? channelToStringHint(channel, config.hexChannelBase ?? 1) : null,
    };
  }

  return {
    ...common,
    type: 'other',
    typeLabel: 'Other',
  };
}
