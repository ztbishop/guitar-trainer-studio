// SVG neck coordinates only. Frets and note centers deliberately differ.
export function fretboardGeometry(maxFret = 24, stringCount = 6, availableWidth = 1200) {
  // Reserve a readable cell for every fret, then distribute remaining width
  // with the neck's taper. Only horizontal geometry responds to the viewport.
  const width = Math.max(160 + 26 * maxFret, Math.round(availableWidth));
  const stringGap = 24, firstY = 34, lastY = firstY + (stringCount - 1) * stringGap;
  return {width, height: lastY + 16, nutX: 100, endX: width - 60, firstY, lastY, stringGap, top: 22, bottom: lastY + 12};
}

export function fretInlayYs(stringCount, double = false) {
  const {firstY, lastY, stringGap} = fretboardGeometry(24, stringCount);
  if(!double || stringCount < 3)return [(firstY + lastY) / 2];
  // Use symmetric string gaps near the neck's quarter points. On six strings,
  // these are the gaps between strings 2–3 and 4–5, rather than the center gap.
  const upperGap = Math.max(0, Math.round((stringCount - 1) / 4 - 0.5)) + 0.5;
  return [firstY + upperGap * stringGap, lastY - upperGap * stringGap];
}

export function fretWireX(fret, maxFret, leftHanded = false, availableWidth = 1200) {
  const {width, nutX, endX} = fretboardGeometry(maxFret,6,availableWidth);
  const x = nutX + 24 * fret + (endX - nutX - 24 * maxFret) * (1 - 2 ** (-fret / 12)) / (1 - 2 ** (-maxFret / 12));
  return leftHanded ? width - x : x;
}

export function fretX(fret, maxFret, leftHanded = false, availableWidth = 1200) {
  const {width, nutX} = fretboardGeometry(maxFret,6,availableWidth);
  const x = fret === 0 ? nutX - 24 : (fretWireX(fret - 1, maxFret,false,availableWidth) + fretWireX(fret, maxFret,false,availableWidth)) / 2;
  return leftHanded ? width - x : x;
}

export function fretNumberVisible(fret,maxFret,width,targetFrets=[]) {
  return width>=160+42*maxFret || fret===0 || fret===maxFret ||
    targetFrets.includes(fret) || [3,5,7,9,0].includes(fret%12);
}
