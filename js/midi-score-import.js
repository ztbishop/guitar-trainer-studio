// Convert the performance file on demand. The score library keeps its original bytes.
let converterScript;
function loadConverter() {
  if (!converterScript) converterScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../assets/vendor/webmscore/webmscore.js', import.meta.url).href;
    script.onload = () => resolve(window.WebMscore);
    script.onerror = () => {
      converterScript = null;
      script.remove();
      reject(new Error('Could not load the bundled MIDI converter.'));
    };
    document.head.append(script);
  });
  return converterScript;
}

export async function midiToMusicXml(bytes) {
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'MThd') throw new Error('Choose a Standard MIDI File (.mid or .midi).');
  const Converter = await loadConverter();
  // The upstream convenience load() transfers its input buffer and exposes the
  // worker only on success. Own the worker here so failed imports release it too.
  const converter = new Converter();
  const copy = bytes.slice();
  let timeout;
  const failure = new Promise((_, reject) => {
    converter.worker.onerror = () => reject(new Error('The MIDI converter could not read this file.'));
    timeout = setTimeout(() => reject(new Error('MIDI conversion timed out. Try a shorter or simplified MIDI file.')), 120000);
  });
  try {
    const convert = async () => {
      await converter.rpc('ready');
      await converter.rpc('load', ['midi', copy, [], true], [copy.buffer]);
      const xml = await converter.saveXml();
      return new TextEncoder().encode(xml);
    };
    return await Promise.race([convert(), failure]);
  } finally {
    clearTimeout(timeout);
    converter.destroy(false);
  }
}
