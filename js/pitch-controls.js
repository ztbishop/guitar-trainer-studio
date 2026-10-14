// pitch-controls.js
// Owns the Pitch & Transpose menu controls; alphaTab operations stay in the host.

export function initPitchControls(onOffsetChange) {
  const fieldset=document.getElementById('playback-pitch-controls');
  const input=document.getElementById('playback-pitch-semitones');
  const status=document.getElementById('pitch-offset-status');
  const reset=document.getElementById('reset-playback-pitch');
  if(!fieldset || !input)return {sync(){}};

  function update(value) {
    if(!Number.isInteger(value) || value < -12 || value > 12) {
      if(status)status.textContent='Enter a whole number from −12 to +12.';
      return false;
    }
    if(!onOffsetChange?.(value)) {
      if(status)status.textContent='Score playback is not ready yet.';
      return false;
    }
    input.value=String(value);
    if(status)status.textContent=value===0?'Pitch: written':`Pitch: ${value>0?'+':''}${value} semitones`;
    return true;
  }

  input.addEventListener('change',()=>update(input.valueAsNumber));
  reset?.addEventListener('click',()=>{input.value='0';update(0);});

  return {sync({enabled=fieldset.disabled===false,value=Number(input.value)||0}={}) {
    fieldset.disabled=!enabled;
    input.value=String(value);
    if(status && !enabled)status.textContent='Load a score to enable pitch shifting.';
    else if(enabled)update(value);
  }};
}
