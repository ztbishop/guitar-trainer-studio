// Theme policy only; native color conversion and rendering belong to the host.
export const APPEARANCES=['light','soft-light','dark'];
export const normalizeAppearance=value=>APPEARANCES.includes(value)?value:'light';
export function applyAppearance(value) {
  const theme=normalizeAppearance(value);
  if(typeof document!=='undefined')document.documentElement.dataset.appearance=theme;
  return theme;
}
export function scoreColors(value,{print=false}={}) {
  if(print)return Object.fromEntries(['mainGlyphColor','secondaryGlyphColor','staffLineColor','barSeparatorColor','barNumberColor','scoreInfoColor'].map(key=>[key,'#000000']));
  return normalizeAppearance(value)==='dark'
    ? {mainGlyphColor:'#e8edf2',secondaryGlyphColor:'#e8edf2',staffLineColor:'#9da9b5',barSeparatorColor:'#c6d0da',barNumberColor:'#aebdce',scoreInfoColor:'#e8edf2'}
    : {mainGlyphColor:'#000000',secondaryGlyphColor:'#000000',staffLineColor:'#a5a5a5',barSeparatorColor:'#222211',barNumberColor:'#c80000',scoreInfoColor:'#000000'};
}
