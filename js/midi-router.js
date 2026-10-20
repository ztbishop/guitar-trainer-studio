// midi-router.js
// Owns: MIDI device setup and normalized note events
// Do NOT: decide correctness here

import {captureMidiEvent,captureMidiOutcome} from './midi-capture.js';

import { AppState } from './app-state.js';
import { channelToStringHint, midiToNoteName } from './note-utils.js';
import {MidiDevicePreferences,MIDI_DEVICE_DEFAULTS} from './midi-device-preferences.js';

let midiAccess = null;
let activeInput = null;
let activeListener = null;
let inventorySignature=null,listenerEpoch=0,accessEpoch=0;
let devicePreferences=null;
function currentSettings() {
  return {inputMode:AppState.inputMode,singleChannel:AppState.midi.singleChannel,
    hexChannelBase:AppState.midi.hexChannelBase,hexChannelReverse:AppState.midi.hexChannelReverse,
    pitchBendRange:AppState.midi.pitchBendRange,latencyMs:AppState.trainer.latencyMs,ignoreBriefErrors:AppState.midi.ignoreBriefErrors,minErrorMs:AppState.midi.minErrorMs};
}
export function saveActiveMidiSettings() {
  if(activeInput)devicePreferences?.remember(activeInput,currentSettings());
}
function restoreSettings(settings) {
  AppState.inputMode=settings.inputMode;AppState.trainer.latencyMs=settings.latencyMs;
  for(const key of ['singleChannel','hexChannelBase','hexChannelReverse','pitchBendRange','ignoreBriefErrors','minErrorMs'])AppState.midi[key]=settings[key];
}
function noInputStatus(){return devicePreferences?.lastInput?`Waiting for ${devicePreferences.lastInput.name || 'the last MIDI input'}`:'No MIDI input selected';}
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

export function clearActiveMidiNotes(notify=true) {
  AppState.midi.activeNotes.clear();
  AppState.midi.activeNotesByChannel.clear();
  AppState.midi.lastEvent = null;
  AppState.midi.recentEvents = [];
  if(notify)updateStateChange();
}

function updateStateChange(reason='settings') {
  AppState.midi.waitingInputName=!activeInput && devicePreferences?.lastInput
    ? devicePreferences.lastInput.name || 'last MIDI input' : '';
  callbacks.onStateChange?.({ ...AppState.midi },reason);
}

function getInputs() {
  if (!midiAccess) return [];
  return Array.from(midiAccess.inputs.values()).filter(input=>input.state!=='disconnected').map((input) => ({
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
  return channelToStringHint(event.channel, base, AppState.midi.hexChannelReverse) !== null;
}

function setActiveInput(input,restore=null) {
  if(input?.state==='disconnected')input=null;
  if(input===activeInput && AppState.midi.activeInputId===(input?.id || ''))return false;
  const previousInput=activeInput;
  saveActiveMidiSettings();
  if (activeInput && activeListener) {
    activeInput.removeEventListener('midimessage', activeListener);
  }

  activeInput = input || null;
  const epoch=++listenerEpoch;
  if(input) {
    restoreSettings(restore?.settings??devicePreferences?.profile(input)?.settings??MIDI_DEVICE_DEFAULTS);
    devicePreferences?.remember(input,currentSettings(),true,restore?.previousId??input.id);
  }
  AppState.midi.activeInputId = input?.id || '';
  clearActiveMidiNotes(false);

  if (activeInput) {
    const source=activeInput;
    activeListener = (message) => {
      if(epoch!==listenerEpoch || activeInput!==source || source.state==='disconnected')return;
      const receivedAt=performance.now();
      const normalized = normalizeMidiMessage(message, {
        inputMode: AppState.inputMode,
        hexChannelBase: AppState.midi.hexChannelBase,
        hexChannelReverse: AppState.midi.hexChannelReverse,
      });

      if (!normalized) return;
      const accepted=isEventInSelectedChannelRange(normalized);
      const capture=captureMidiEvent(normalized,{input:source,accepted,receivedAt});
      // Release tracked notes even if the selected filter has changed.
      if (normalized.type === 'note-off') removeActiveNote(normalized);
      if (!accepted) {
        updateStateChange('message');
        captureMidiOutcome(capture,null);
        return;
      }

      if (normalized.type === 'note-on') {
        const key=getActiveNoteKey(normalized.channel,normalized.midi);
        if(AppState.midi.activeNotes.has(key)) {
          // Some MIDI sources emit another Note-On for a pitch that is still
          // held. It is not a fresh attack and must not grade the next target.
          AppState.midi.lastEvent=normalized;
          AppState.midi.recentEvents=[normalized,...AppState.midi.recentEvents].slice(0,8);
          AppState.ui.midiStatus=`Receiving from ${activeInput.name || 'MIDI input'}`;
          updateStateChange('message');
          captureMidiOutcome(capture,{type:'ignored-held-duplicate',eventId:null,midi:normalized.midi});
          return;
        }
        addActiveNote(normalized);
      }

      AppState.midi.lastEvent = normalized;
      AppState.midi.recentEvents = [normalized, ...AppState.midi.recentEvents].slice(0, 8);
      AppState.ui.midiStatus = `Receiving from ${activeInput.name || 'MIDI input'}`;
      updateStateChange('message');
      const outcome=callbacks.onMidiEvent?.(normalized);
      captureMidiOutcome(capture,outcome);
    };

    activeInput.addEventListener('midimessage', activeListener);
    AppState.ui.midiStatus = `Listening: ${activeInput.name || 'MIDI input'}`;
  } else {
    activeListener = null;
    AppState.ui.midiStatus = AppState.midi.supported ? noInputStatus() : 'Web MIDI unavailable';
  }

  // Removing a listener does not release an implicitly opened MIDI port. Close
  // only our old port, once, without waiting or retrying during USB removal.
  try {previousInput?.close?.()?.catch?.(()=>{});}catch{}
  updateStateChange('device');return true;
}

function refreshInputs(event) {
  if(event?.port?.type==='output')return;
  const inputs=getInputs(),signature=JSON.stringify(inputs);
  const restored=devicePreferences?.resolve(inputs);
  const desiredId=restored?.device.id || '';
  const input=inputs.some(item=>item.id===desiredId)?midiAccess.inputs.get(desiredId):null;
  if(signature===inventorySignature && input===activeInput)return;
  inventorySignature=signature;AppState.midi.availableInputs=inputs;
  if(!setActiveInput(input,restored)) {
    if(!input)AppState.ui.midiStatus=AppState.midi.supported?noInputStatus():'Web MIDI unavailable';
    updateStateChange('inventory');
  }
}

export async function initMidiRouter({ onMidiEvent, onStateChange,deviceStorage } = {}) {
  const epoch=++accessEpoch;
  if(midiAccess)midiAccess.onstatechange=null;
  saveActiveMidiSettings();
  const previousInput=activeInput;
  if(activeInput && activeListener)activeInput.removeEventListener('midimessage',activeListener);
  activeInput=null;activeListener=null;++listenerEpoch;clearActiveMidiNotes(false);
  let previousClosed=false;
  const closePrevious=()=>{
    if(previousClosed || previousInput===activeInput)return;
    previousClosed=true;try{previousInput?.close?.()?.catch?.(()=>{});}catch{}
  };
  callbacks.onMidiEvent = onMidiEvent || null;
  callbacks.onStateChange = onStateChange || null;
  AppState.midi.accessRequested = true;

  if (!navigator.requestMIDIAccess) {
    closePrevious();
    AppState.midi.supported = false;
    AppState.midi.activeInputId='';AppState.midi.availableInputs=[];
    AppState.ui.midiStatus = 'Web MIDI is not supported in this browser';
    updateStateChange();
    return null;
  }

  try {
    const access=await navigator.requestMIDIAccess();
    if(epoch!==accessEpoch){closePrevious();return null;}
    devicePreferences=new MidiDevicePreferences(deviceStorage);
    midiAccess = access;inventorySignature=null;
    AppState.midi.supported = true;
    midiAccess.onstatechange = event => {
      if(epoch===accessEpoch)refreshInputs(event);
    };
    refreshInputs();
    closePrevious();
    return midiAccess;
  } catch (error) {
    closePrevious();
    if(epoch!==accessEpoch)return null;
    console.error('Could not get MIDI access.', error);
    AppState.midi.supported = false;
    AppState.midi.activeInputId='';AppState.midi.availableInputs=[];
    AppState.ui.midiStatus = 'Could not access MIDI devices';
    updateStateChange();
    return null;
  }
}

export function setActiveMidiInput(inputId) {
  if (!midiAccess) return false;
  if(inputId==='') {
    saveActiveMidiSettings();devicePreferences?.selectNone();
    if(!setActiveInput(null)) {
      AppState.ui.midiStatus=noInputStatus();updateStateChange('inventory');
    }
    return true;
  }
  const input = midiAccess.inputs.get(inputId);
  if (!input || input.state==='disconnected') return false;
  setActiveInput(input);
  return true;
}

export function normalizeMidiMessage(message, config = {}) {
  const data = Array.from(message?.data || []);
  if (data.length < 1) return null;

  const [status, midi, velocity = 0] = data;
  if (status < 0x80 || status >= 0xf0) return null;
  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  const inputMode = config.inputMode || 'single-channel';
  const isNote = command === 0x80 || command === 0x90;
  if ((isNote || command === 0xe0 || command === 0xb0) && data.length < 3) return null;
  const common = {
    channel,
    midi: isNote && Number.isFinite(midi) ? midi : null,
    velocity: isNote && Number.isFinite(velocity) ? velocity : null,
    noteName: isNote && Number.isFinite(midi) ? midiToNoteName(midi) : null,
    stringHint: inputMode === 'hex-6ch' ? channelToStringHint(channel, config.hexChannelBase ?? 1, config.hexChannelReverse) : null,
    inputMode,
    raw: data,
    at: Number.isFinite(message?.timeStamp) ? message.timeStamp : performance.now(),
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
      bendValue: ((velocity << 7) | midi) - 8192,
      midi: null,
      noteName: null,
      stringHint: inputMode === 'hex-6ch' ? channelToStringHint(channel, config.hexChannelBase ?? 1, config.hexChannelReverse) : null,
    };
  }

  return {
    ...common,
    type: command === 0xb0 ? 'control-change' : 'other',
    typeLabel: command === 0xb0 ? 'Control change' : 'Other',
    controller: command === 0xb0 ? midi : null,
    value: command === 0xb0 ? velocity : null,
  };
}
