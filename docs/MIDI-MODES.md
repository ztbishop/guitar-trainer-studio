# MIDI Modes

## Single-channel
Use this mode when the input device sends note data on one channel.
The UI lets the player listen to Any channel or lock input to channels 1-16.
This mode is the right starting point for pitch-first trainer logic.

## Hexaphonic (6 channels)
Use this mode when the input device maps one guitar string per MIDI channel.
The UI uses a Hex base channel setting. The app then treats that base channel as string 6 (low E) and maps the next five channels upward to strings 5 through 1.
This mode is the foundation for later string-aware and fret-aware trainer rules.
